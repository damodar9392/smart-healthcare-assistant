const SymptomSearch = require('../models/SymptomSearch');
const { analyzeSymptoms } = require('../services/aiService');
const { evaluateUrgency } = require('../services/urgencyService');
const asyncHandler = require('../utils/asyncHandler');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const DISCLAIMER =
  'This analysis is general educational guidance only and does not constitute a medical diagnosis. Always consult a qualified healthcare professional for an actual diagnosis or treatment.';

const analyzeValidation = [
  body('symptoms')
    .isArray({ min: 1 })
    .withMessage('At least one main symptom is required'),
  body('symptoms.*')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Each symptom must be 2-100 characters'),
  body('additionalSymptoms')
    .optional()
    .isArray()
    .withMessage('additionalSymptoms must be an array'),
  body('additionalSymptoms.*')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Each additional symptom must be 2-100 characters'),
  body('durationInDays')
    .isInt({ min: 1, max: 365 })
    .withMessage('Duration must be between 1 and 365 days'),
  body('severity')
    .isIn(['mild', 'moderate', 'severe'])
    .withMessage('Severity must be mild, moderate or severe'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  validate,
];

const analyze = asyncHandler(async (req, res) => {
  const payload = {
    symptoms: req.body.symptoms,
    additionalSymptoms: req.body.additionalSymptoms || [],
    durationInDays: req.body.durationInDays,
    severity: req.body.severity,
    description: req.body.description || '',
  };

  const urgency = evaluateUrgency(
    payload.symptoms,
    payload.durationInDays,
    payload.severity,
    payload.description
  );

  const result = await analyzeSymptoms(payload);

  const data = {
    ...result,
    urgencyLevel: urgency.urgency,
    message: urgency.message,
    showTemporaryGuidance: urgency.showTemporaryGuidance,
    matchedRules: urgency.matchedRules,
  };

  if (req.user) {
    await SymptomSearch.create({ ...payload, user: req.user._id, result: data });
  }

  res.json({ success: true, data: { ...data, disclaimer: DISCLAIMER } });
});

const getMySearches = asyncHandler(async (req, res) => {
  const data = await SymptomSearch.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);
  res.json({ success: true, data });
});

module.exports = { analyze, getMySearches, analyzeValidation };