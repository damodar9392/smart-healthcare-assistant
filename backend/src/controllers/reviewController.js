const Review = require('../models/Review');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const { recomputeDoctorRating } = require('../services/ratingService');
const { notifyUser } = require('../services/notificationService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const writeValidation = [
  body('doctor').isMongoId().withMessage('Valid doctor id required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 2000 }).withMessage('Comment too long'),
  validate,
];

const create = asyncHandler(async (req, res) => {
  const { doctor, rating, comment } = req.body;

  const profile = await DoctorProfile.exists({ user: doctor });
  if (!profile) {
    throw new ApiError(400, 'Doctor profile not found');
  }

  const appointment = await Appointment.findOne({
    patient: req.user._id,
    doctor,
    status: 'completed',
  }).sort({ date: -1, startTime: -1 });
  if (!appointment) {
    throw new ApiError(403, 'Only patients with a completed appointment can review a doctor');
  }

  const alreadyReviewed = await Review.exists({
    patient: req.user._id,
    appointment: appointment._id,
  });
  if (alreadyReviewed) {
    throw new ApiError(409, 'You have already reviewed this appointment');
  }

  const review = await Review.create({
    patient: req.user._id,
    doctor,
    rating,
    comment,
    appointment: appointment._id,
  });
  await recomputeDoctorRating(doctor);
  await notifyUser(
    doctor,
    'review',
    'New review received',
    `You received a ${rating}-star review from a patient`,
    review._id
  );

  res.status(201).json({ success: true, data: review });
});

const getMyReviews = asyncHandler(async (req, res) => {
  const data = await Review.find({ patient: req.user._id })
    .populate('doctor', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, data });
});

const listByDoctor = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  const filter = { doctor: req.params.doctorId };
  const [data, total] = await Promise.all([
    Review.find(filter)
      .populate('patient', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Review.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const adminList = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  const filter = {};
  if (req.query.rating) {
    filter.rating = Number(req.query.rating);
  }
  if (req.query.patientId) {
    filter.patient = req.query.patientId;
  }
  if (req.query.doctorId) {
    filter.doctor = req.query.doctorId;
  }
  if (req.query.q) {
    filter.comment = new RegExp(escapeRegex(req.query.q), 'i');
  }

  const [data, total] = await Promise.all([
    Review.find(filter)
      .populate('patient', 'name')
      .populate('doctor', 'name')
      .populate('appointment', 'date startTime')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const update = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }
  if (!review.patient.equals(req.user._id)) {
    throw new ApiError(403, 'Not allowed to edit this review');
  }
  review.rating = req.body.rating;
  if (req.body.comment !== undefined) {
    review.comment = req.body.comment;
  }
  await review.save();
  await recomputeDoctorRating(review.doctor);
  res.json({ success: true, data: review });
});

const remove = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }
  const isOwner = review.patient.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed to delete this review');
  }
  await review.deleteOne();
  await recomputeDoctorRating(review.doctor);
  res.json({ success: true, message: 'Review deleted' });
});

module.exports = {
  create,
  getMyReviews,
  listByDoctor,
  adminList,
  update,
  remove,
  writeValidation,
};
