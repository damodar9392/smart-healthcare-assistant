const Symptom = require('../models/Symptom');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const CATEGORIES = [
  'general',
  'respiratory',
  'cardiovascular',
  'digestive',
  'neurological',
  'musculoskeletal',
  'dermatological',
  'ent',
  'eye',
  'psychiatric',
];

const writeValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('category').isIn(CATEGORIES).withMessage('Invalid symptom category'),
  body('severityLevel')
    .optional()
    .isIn(['mild', 'moderate', 'severe', 'critical'])
    .withMessage('Invalid severity level'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('recommendedSpecialty').optional().trim(),
  validate,
];

const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) {
    filter.category = req.query.category;
  }
  if (req.query.severityLevel) {
    filter.severityLevel = req.query.severityLevel;
  }
  if (req.query.q) {
    filter.name = new RegExp(escapeRegex(req.query.q), 'i');
  }
  const data = await Symptom.find(filter).sort({ name: 1 });
  res.json({ success: true, data });
});

const getById = asyncHandler(async (req, res) => {
  const symptom = await Symptom.findById(req.params.id);
  if (!symptom) {
    throw new ApiError(404, 'Symptom not found');
  }
  res.json({ success: true, data: symptom });
});

const SYMPTOM_FIELDS = [
  'name',
  'category',
  'severityLevel',
  'description',
  'recommendedSpecialty',
];

const create = asyncHandler(async (req, res) => {
  const payload = {};
  for (const field of SYMPTOM_FIELDS) {
    if (field in req.body) payload[field] = req.body[field];
  }
  const symptom = await Symptom.create(payload);
  res.status(201).json({ success: true, data: symptom });
});

const update = asyncHandler(async (req, res) => {
  const payload = {};
  for (const field of SYMPTOM_FIELDS) {
    if (field in req.body) payload[field] = req.body[field];
  }
  const symptom = await Symptom.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!symptom) {
    throw new ApiError(404, 'Symptom not found');
  }
  res.json({ success: true, data: symptom });
});

const remove = asyncHandler(async (req, res) => {
  const symptom = await Symptom.findByIdAndDelete(req.params.id);
  if (!symptom) {
    throw new ApiError(404, 'Symptom not found');
  }
  res.json({ success: true, message: 'Symptom deleted' });
});

module.exports = { list, getById, create, update, remove, writeValidation };
