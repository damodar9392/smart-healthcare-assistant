const { evaluateUrgency, getRuleSet } = require('../services/urgencyService');
const asyncHandler = require('../utils/asyncHandler');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const evaluateValidation = [
  body('symptoms')
    .isArray({ min: 1 })
    .withMessage('At least one symptom is required'),
  body('symptoms.*')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Each symptom must be 2-100 characters'),
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

const evaluate = asyncHandler(async (req, res) => {
  const result = evaluateUrgency(
    req.body.symptoms,
    req.body.durationInDays,
    req.body.severity,
    req.body.description || ''
  );
  res.json({ success: true, data: result });
});

const getRules = asyncHandler(async (req, res) => {
  res.json({ success: true, data: getRuleSet() });
});

module.exports = { evaluate, getRules, evaluateValidation };