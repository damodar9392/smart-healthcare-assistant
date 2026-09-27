const DoctorProfile = require('../models/DoctorProfile');
const DoctorAvailability = require('../models/DoctorAvailability');
const Appointment = require('../models/Appointment');
const {
  scoreDoctors,
  compareByScore,
  getMatchConfig,
} = require('../services/doctorMatchingService');
const { buildAvailabilityIndex, BLOCKING_STATUSES } = require('../services/slotService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { query } = require('express-validator');
const validate = require('../middleware/validate');

const matchValidation = [
  query('specialization').optional().trim().isLength({ max: 200 }).withMessage('specialization cannot exceed 200 characters'),
  query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('lat must be a number between -90 and 90'),
  query('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('lng must be a number between -180 and 180'),
  query('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('latitude must be a number between -90 and 90'),
  query('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('longitude must be a number between -180 and 180'),
  query('city').optional().trim().isLength({ max: 200 }).withMessage('city cannot exceed 200 characters'),
  query('maxDistance').optional().isInt({ min: 1, max: 500000 }).withMessage('maxDistance must be a positive distance in meters (max 500 km)'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  validate,
];

const PUBLIC_PROJECTION = {
  _id: 1,
  user: 1,
  profilePhoto: 1,
  qualification: 1,
  specialization: 1,
  experience: 1,
  hospital: 1,
  consultationFee: 1,
  rating: 1,
  ratingCount: 1,
  location: 1,
  about: 1,
};

const readCoordinates = (req) => {
  const lat = req.query.lat ?? req.query.latitude;
  const lng = req.query.lng ?? req.query.longitude;
  if (lat === undefined || lng === undefined) {
    return null;
  }
  return { lat: parseFloat(lat), lng: parseFloat(lng) };
};

const fetchCandidates = async ({ coordinates, city, candidateCap, maxDistanceMeters }) => {
  const match = { verificationStatus: 'verified' };
  if (city) {
    match['hospital.city'] = new RegExp(escapeRegex(city), 'i');
  }

  if (coordinates) {
    return DoctorProfile.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [coordinates.lng, coordinates.lat],
          },
          distanceField: 'distanceMeters',
          maxDistance: maxDistanceMeters,
          spherical: true,
          key: 'location',
          query: match,
        },
      },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userInfo' } },
      { $unwind: '$userInfo' },
      {
        $project: {
          ...PUBLIC_PROJECTION,
          name: '$userInfo.name',
        },
      },
      { $limit: candidateCap },
    ]);
  }

  return DoctorProfile.find(match)
    .select(
      '_id user profilePhoto qualification specialization experience hospital consultationFee rating ratingCount location about'
    )
    .populate('user', 'name')
    .limit(candidateCap)
    .lean();
};

const match = asyncHandler(async (req, res) => {
  const config = getMatchConfig();
  const candidateCap = config.limits.candidateCap;
  const coordinates = readCoordinates(req);
  const city = req.query.city ? req.query.city.trim() : '';
  const specialization = req.query.specialization ? req.query.specialization.trim() : '';

  if (!specialization && !city && !coordinates) {
    throw new ApiError(
      400,
      'Provide specialization, city, or lat/lng so the match score has something to rank against'
    );
  }

  const maxDistanceMeters = parseInt(req.query.maxDistance, 10) || 10000;

  const candidates = await fetchCandidates({
    coordinates,
    city,
    candidateCap,
    maxDistanceMeters,
  });

  const doctorUserIds = candidates
    .map((candidate) => candidate.user?._id || candidate.user)
    .filter(Boolean);

  const horizonDays = config.availability.horizonDays;
  const now = new Date();
  const horizonEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + horizonDays)
  );

  const [windows, appointments] = await Promise.all([
    doctorUserIds.length > 0
      ? DoctorAvailability.find({
          doctor: { $in: doctorUserIds },
          isAvailable: true,
        }).select('doctor dayOfWeek startTime endTime').lean()
      : [],
    doctorUserIds.length > 0
      ? Appointment.find({
          doctor: { $in: doctorUserIds },
          date: { $gte: now, $lte: horizonEnd },
          status: { $in: BLOCKING_STATUSES },
        }).select('doctor date startTime').lean()
      : [],
  ]);

  const availabilityIndex = buildAvailabilityIndex(windows, appointments);

  const scored = scoreDoctors(candidates, {
    specialization,
    origin: coordinates ? { maxDistanceMeters } : null,
    availabilityIndex,
    now,
  }).sort(compareByScore);

  const total = scored.length;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const data = scored.slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      candidateCap,
    },
    match: {
      specialization: specialization || null,
      mode: coordinates ? 'geo' : 'city',
      weights: config.weights,
      normalization: config.normalization.mode,
      availabilityHorizonDays: horizonDays,
      sponsoredServicesExcluded: true,
    },
  });
});

module.exports = { match, matchValidation };
