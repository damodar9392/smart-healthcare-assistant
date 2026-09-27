const SponsoredService = require('../models/SponsoredService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const writeValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Name must be 2-200 characters'),
  body('category')
    .optional()
    .isIn([
      'pharmacy',
      'diagnostics',
      'checkup',
      'insurance',
      'consultation',
      'clinic',
      'wellness',
      'emergency',
      'other',
    ])
    .withMessage('Invalid category'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price cannot be negative'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [longitude, latitude]'),
  body('location.coordinates.*')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid coordinate value'),
  body('contact.phone').optional().matches(/^\+?[0-9\s()-]{7,15}$/).withMessage('Invalid phone'),
  body('contact.email').optional().isEmail().withMessage('Invalid email'),
  body('contact.website').optional().trim().isURL().withMessage('Invalid website URL'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isSponsored').optional().isBoolean().withMessage('isSponsored must be a boolean'),
  body('sponsor')
    .optional()
    .custom((value, { req }) => {
      if (req.body.isSponsored && !(value && String(value).trim().length >= 2)) {
        throw new Error('sponsor name is required when isSponsored is true');
      }
      return true;
    }),
  validate,
];

const list = asyncHandler(async (req, res) => {
  const { category, lat, lng, maxDistance } = req.query;
  const filter = { isActive: true };
  if (category) {
    filter.category = category;
  }
  if (lat !== undefined && lng !== undefined) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const radius = parseInt(maxDistance, 10) || 10000;
    if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
      const data = await SponsoredService.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [parsedLng, parsedLat] },
            distanceField: 'distanceInMeters',
            maxDistance: radius,
            spherical: true,
            query: filter,
          },
        },
        { $sort: { distanceInMeters: 1 } },
      ]);
      res.json({
        success: true,
        data: data.map((service) => ({
          ...service,
          distanceKm: Math.round((service.distanceInMeters / 1000) * 10) / 10,
        })),
      });
      return;
    }
  }
  const data = await SponsoredService.find(filter).sort({ name: 1 });
  res.json({ success: true, data });
});

const adminList = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = {};
  if (req.query.isActive !== undefined && req.query.isActive !== '') {
    filter.isActive = req.query.isActive === 'true';
  }
  if (req.query.category) {
    filter.category = req.query.category;
  }
  if (req.query.q) {
    filter.name = new RegExp(escapeRegex(req.query.q), 'i');
  }

  const [data, total] = await Promise.all([
    SponsoredService.find(filter)
      .sort({ isActive: -1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    SponsoredService.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getById = asyncHandler(async (req, res) => {
  const service = await SponsoredService.findById(req.params.id);
  if (!service) {
    throw new ApiError(404, 'Sponsored service not found');
  }
  res.json({ success: true, data: service });
});

const SERVICE_FIELDS = [
  'name',
  'category',
  'description',
  'price',
  'location',
  'contact',
  'isActive',
  'isSponsored',
  'sponsor',
];

const create = asyncHandler(async (req, res) => {
  const payload = {};
  for (const field of SERVICE_FIELDS) {
    if (field in req.body) payload[field] = req.body[field];
  }
  const service = await SponsoredService.create(payload);
  res.status(201).json({ success: true, data: service });
});

const update = asyncHandler(async (req, res) => {
  const payload = {};
  for (const field of SERVICE_FIELDS) {
    if (field in req.body) payload[field] = req.body[field];
  }
  const service = await SponsoredService.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!service) {
    throw new ApiError(404, 'Sponsored service not found');
  }
  res.json({ success: true, data: service });
});

const remove = asyncHandler(async (req, res) => {
  const service = await SponsoredService.findByIdAndDelete(req.params.id);
  if (!service) {
    throw new ApiError(404, 'Sponsored service not found');
  }
  res.json({ success: true, message: 'Sponsored service deleted' });
});

module.exports = { list, adminList, getById, create, update, remove, writeValidation };
