const DoctorProfile = require('../models/DoctorProfile');
const DoctorAvailability = require('../models/DoctorAvailability');
const { generateSlots } = require('../services/slotService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const PROFILE_FIELDS = [
  'profilePhoto',
  'qualification',
  'specialization',
  'experience',
  'hospital',
  'consultationFee',
  'location',
  'about',
];

const PUBLIC_SELECT = '-verificationDetails -verificationHistory';

const profileValidation = [
  body('profilePhoto')
    .optional({ values: 'falsy' })
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('profilePhoto must be a valid http(s) URL'),
  body('qualification')
    .isArray({ min: 1 })
    .withMessage('At least one qualification is required'),
  body('qualification.*')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Qualification entries must be non-empty strings'),
  body('specialization').trim().notEmpty().withMessage('Specialization is required'),
  body('experience')
    .isInt({ min: 0, max: 70 })
    .withMessage('Experience must be a number of years (0-70)'),
  body('hospital.name').trim().notEmpty().withMessage('Hospital or clinic name is required'),
  body('hospital.address').optional().trim(),
  body('hospital.city').optional().trim(),
  body('consultationFee')
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a positive number'),
  body('location.type').optional().equals('Point').withMessage('Location type must be Point'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [longitude, latitude]'),
  body('location.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('location.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('about')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('About cannot exceed 1000 characters'),
  validate,
];

const slotValidation = [
  body('dayOfWeek')
    .isInt({ min: 0, max: 6 })
    .withMessage('dayOfWeek must be 0 (Sunday) to 6 (Saturday)'),
  body('startTime')
    .matches(TIME_PATTERN)
    .withMessage('startTime must be HH:MM 24-hour format'),
  body('endTime').matches(TIME_PATTERN).withMessage('endTime must be HH:MM 24-hour format'),
  validate,
];

const verifyValidation = [
  body('status')
    .isIn(['verified', 'rejected'])
    .withMessage('Status must be verified or rejected'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long'),
  validate,
];

const verificationDetailsValidation = [
  body('licenseNumber').trim().notEmpty().withMessage('License number is required'),
  body('licenseNumber')
    .isLength({ max: 100 })
    .withMessage('License number cannot exceed 100 characters'),
  body('issuingAuthority')
    .trim()
    .notEmpty()
    .withMessage('Issuing authority is required'),
  body('issuingAuthority')
    .isLength({ max: 200 })
    .withMessage('Issuing authority cannot exceed 200 characters'),
  validate,
];

const pickProfileFields = (body) => {
  const picked = {};
  PROFILE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      picked[field] = body[field];
    }
  });
  return picked;
};

const list = asyncHandler(async (req, res) => {
  const { specialization, city, minRating, maxFee, lat, lng, maxDistance } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = {};
  const isAdmin = req.user && req.user.role === 'admin';
  if (isAdmin) {
    if (req.query.verificationStatus) {
      filter.verificationStatus = req.query.verificationStatus;
    }
  } else {
    filter.verificationStatus = 'verified';
  }
  if (specialization) {
    filter.specialization = new RegExp(escapeRegex(specialization), 'i');
  }
  if (city) {
    filter['hospital.city'] = new RegExp(escapeRegex(city), 'i');
  }
  if (minRating !== undefined && minRating !== '') {
    filter.rating = { $gte: parseFloat(minRating) };
  }
  if (maxFee !== undefined && maxFee !== '') {
    filter.consultationFee = { $lte: parseFloat(maxFee) };
  }
  if (lat !== undefined && lng !== undefined) {
    filter.location = {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseInt(maxDistance, 10) || 10000,
      },
    };
  }

  const [data, total] = await Promise.all([
    DoctorProfile.find(filter)
      .select(isAdmin ? '' : PUBLIC_SELECT)
      .populate('user', 'name')
      .sort({ rating: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    DoctorProfile.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const canViewFullProfile = (req, profile) => {
  if (!req.user) return false;
  if (req.user.role === 'admin') return true;
  return profile.user && String(profile.user._id) === String(req.user._id);
};

const getById = asyncHandler(async (req, res) => {
  const profile = await DoctorProfile.findById(req.params.id).populate('user', 'name email');
  if (!profile) {
    throw new ApiError(404, 'Doctor profile not found');
  }
  const isOwner = profile.user && req.user && String(profile.user._id) === String(req.user._id);
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isAdmin && !isOwner && profile.verificationStatus !== 'verified') {
    throw new ApiError(404, 'Doctor profile not found');
  }
  if (!canViewFullProfile(req, profile)) {
    profile.verificationDetails = undefined;
    profile.verificationHistory = undefined;
  }
  res.json({ success: true, data: profile });
});

const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await DoctorProfile.findOne({ user: req.user._id });
  if (!profile) {
    throw new ApiError(404, 'Profile not found, create one with POST /api/doctors/me');
  }
  res.json({ success: true, data: profile });
});

const createMyProfile = asyncHandler(async (req, res) => {
  const existing = await DoctorProfile.findOne({ user: req.user._id });
  if (existing) {
    throw new ApiError(409, 'Profile already exists, use PUT /api/doctors/me to update');
  }
  const profile = await DoctorProfile.create({
    ...pickProfileFields(req.body),
    user: req.user._id,
    verificationStatus: 'pending',
    verificationHistory: [
      { status: 'pending', notes: 'Profile created, awaiting verification' },
    ],
  });
  res.status(201).json({ success: true, data: profile });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const profile = await DoctorProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: pickProfileFields(req.body) },
    { new: true, runValidators: true }
  );
  if (!profile) {
    throw new ApiError(404, 'Profile not found, create one with POST /api/doctors/me');
  }
  res.json({ success: true, data: profile });
});

const submitVerificationDetails = asyncHandler(async (req, res) => {
  const profile = await DoctorProfile.findOne({ user: req.user._id });
  if (!profile) {
    throw new ApiError(404, 'Profile not found, create one with POST /api/doctors/me');
  }
  profile.verificationDetails = {
    licenseNumber: req.body.licenseNumber,
    issuingAuthority: req.body.issuingAuthority,
    submittedAt: new Date(),
  };
  profile.verificationStatus = 'pending';
  profile.verificationHistory.push({
    status: 'pending',
    notes: 'Verification details submitted for review',
  });
  await profile.save();
  res.json({ success: true, data: profile });
});

const verifyDoctor = asyncHandler(async (req, res) => {
  const profile = await DoctorProfile.findById(req.params.id);
  if (!profile) {
    throw new ApiError(404, 'Doctor profile not found');
  }
  profile.verificationStatus = req.body.status;
  profile.verificationHistory.push({
    status: req.body.status,
    changedBy: req.user._id,
    notes: req.body.notes || '',
  });
  await profile.save();
  res.json({ success: true, data: profile });
});

const nearbyValidation = [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('latitude must be a number between -90 and 90'),
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('longitude must be a number between -180 and 180'),
  query('specialization')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('specialization cannot exceed 200 characters'),
  query('maxDistance')
    .optional()
    .isInt({ min: 1, max: 500000 })
    .withMessage('maxDistance must be a positive distance in meters (max 500 km)'),
  validate,
];

const nearby = asyncHandler(async (req, res) => {
  const { latitude, longitude, specialization, maxDistance } = req.query;

  const match = { verificationStatus: 'verified' };
  if (specialization) {
    match.specialization = new RegExp(escapeRegex(specialization), 'i');
  }

  const data = await DoctorProfile.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        distanceField: 'distance',
        maxDistance: parseInt(maxDistance, 10) || 10000,
        spherical: true,
        key: 'location',
        query: match,
      },
    },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userInfo' } },
    { $unwind: '$userInfo' },
    {
      $project: {
        _id: 1,
        name: '$userInfo.name',
        profilePhoto: 1,
        qualification: 1,
        specialization: 1,
        experience: 1,
        hospital: 1,
        consultationFee: 1,
        rating: 1,
        location: 1,
        distance: 1,
        distanceKm: { $round: [{ $divide: ['$distance', 1000] }, 1] },
      },
    },
  ]);

  res.json({ success: true, data });
});

const verificationList = asyncHandler(async (req, res) => {
  const status = req.query.status || 'pending';
  if (!['pending', 'verified', 'rejected'].includes(status)) {
    throw new ApiError(400, 'status must be pending, verified or rejected');
  }
  const data = await DoctorProfile.find({ verificationStatus: status })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  res.json({ success: true, data });
});

const verificationDetail = asyncHandler(async (req, res) => {
  const profile = await DoctorProfile.findById(req.params.id)
    .populate('user', 'name email')
    .populate('verificationHistory.changedBy', 'name');
  if (!profile) {
    throw new ApiError(404, 'Doctor profile not found');
  }
  res.json({ success: true, data: profile });
});

const getSlotsByDate = asyncHandler(async (req, res) => {
  const profile = await DoctorProfile.findById(req.params.id);
  if (!profile) {
    throw new ApiError(404, 'Doctor profile not found');
  }
  const date = req.query.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(400, 'date query parameter is required in YYYY-MM-DD format');
  }
  const slots = await generateSlots(profile.user, new Date(date));
  res.json({ success: true, data: slots });
});

const getPublicAvailability = asyncHandler(async (req, res) => {
  const profile = await DoctorProfile.findById(req.params.id);
  if (!profile) {
    throw new ApiError(404, 'Doctor profile not found');
  }
  const data = await DoctorAvailability.find({
    doctor: profile.user,
    isAvailable: true,
  }).sort({ dayOfWeek: 1, startTime: 1 });
  res.json({ success: true, data });
});

const getMyAvailability = asyncHandler(async (req, res) => {
  const data = await DoctorAvailability.find({ doctor: req.user._id }).sort({
    dayOfWeek: 1,
    startTime: 1,
  });
  res.json({ success: true, data });
});

const addSlot = asyncHandler(async (req, res) => {
  const slot = await DoctorAvailability.create({
    dayOfWeek: req.body.dayOfWeek,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
    doctor: req.user._id,
  });
  res.status(201).json({ success: true, data: slot });
});

const updateSlot = asyncHandler(async (req, res) => {
  const updates = {};
  for (const field of ['dayOfWeek', 'startTime', 'endTime', 'isAvailable']) {
    if (field in req.body) updates[field] = req.body[field];
  }
  const slot = await DoctorAvailability.findOneAndUpdate(
    { _id: req.params.slotId, doctor: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!slot) {
    throw new ApiError(404, 'Availability slot not found');
  }
  res.json({ success: true, data: slot });
});

const deleteSlot = asyncHandler(async (req, res) => {
  const slot = await DoctorAvailability.findOneAndDelete({
    _id: req.params.slotId,
    doctor: req.user._id,
  });
  if (!slot) {
    throw new ApiError(404, 'Availability slot not found');
  }
  res.json({ success: true, message: 'Availability slot deleted' });
});

module.exports = {
  list,
  nearby,
  getById,
  getSlotsByDate,
  getPublicAvailability,
  getMyProfile,
  createMyProfile,
  updateMyProfile,
  submitVerificationDetails,
  verifyDoctor,
  verificationList,
  verificationDetail,
  getMyAvailability,
  addSlot,
  updateSlot,
  deleteSlot,
  profileValidation,
  slotValidation,
  verifyValidation,
  verificationDetailsValidation,
  nearbyValidation,
};
