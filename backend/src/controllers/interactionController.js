const { body } = require('express-validator');
const { evaluateInteractions, getCatalog } = require('../services/interactionService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');

const checkValidation = [
  body('medications')
    .isArray({ min: 1, max: 10 })
    .withMessage('List 1 to 10 medications to check'),
  body('medications.*')
    .trim()
    .isLength({ min: 1, max: 60 })
    .withMessage('Each medication name must be 1-60 characters'),
  validate,
];

const check = asyncHandler(async (req, res) => {
  const result = evaluateInteractions(req.body.medications);

  let level = 'safe';
  if (result.summary.urgent > 0) level = 'urgent';
  else if (result.summary.high > 0) level = 'high';
  else if (result.summary.medium > 0) level = 'medium';

  res.json({
    success: true,
    data: { ...result, level },
  });
});

const catalog = asyncHandler(async (req, res) => {
  res.json({ success: true, data: getCatalog() });
});

module.exports = { check, catalog, checkValidation };