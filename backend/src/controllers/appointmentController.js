const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const { assertSlotAvailable, addMinutes } = require('../services/slotService');
const {
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
} = require('../services/appointmentNotificationService');
const { initiateForAppointment, refundForAppointment } = require('../services/paymentService');
const { notifyUser } = require('../services/notificationService');
const { createVideoRoom, canJoin, openIn } = require('../services/videoService');
const bookingRules = require('../config/bookingRules');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const bookValidation = [
  body('doctor').isMongoId().withMessage('Valid doctor id required'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('startTime').matches(TIME_PATTERN).withMessage('startTime must be HH:MM 24-hour format'),
  body('endTime').matches(TIME_PATTERN).withMessage('endTime must be HH:MM 24-hour format'),
  body('reason')
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage('Reason must be 3-1000 characters'),
  validate,
];

const rescheduleValidation = [
  body('date').isISO8601().withMessage('Valid date required'),
  body('startTime').matches(TIME_PATTERN).withMessage('startTime must be HH:MM 24-hour format'),
  body('endTime').matches(TIME_PATTERN).withMessage('endTime must be HH:MM 24-hour format'),
  validate,
];

const statusValidation = [
  body('status')
    .isIn(['scheduled', 'completed', 'cancelled', 'rescheduled'])
    .withMessage('Invalid status'),
  validate,
];

const adminListValidation = [
  query('status')
    .optional()
    .isIn(['scheduled', 'completed', 'cancelled', 'rescheduled'])
    .withMessage('Invalid status filter'),
  validate,
];

const TRANSITIONS = {
  doctor: {
    scheduled: ['completed', 'cancelled'],
    rescheduled: ['completed', 'cancelled'],
  },
  patient: {
    scheduled: ['cancelled'],
    rescheduled: ['cancelled'],
  },
};

const canTransition = (actorRole, from, to) => {
  if (actorRole === 'admin') {
    return true;
  }
  const allowed = TRANSITIONS[actorRole] && TRANSITIONS[actorRole][from];
  return Boolean(allowed && allowed.includes(to));
};

const dateString = (date) => date.toISOString().slice(0, 10);

const isParticipantId = (appointment, userId) =>
  [appointment.patient, appointment.doctor]
    .filter(Boolean)
    .some((ref) => String(ref._id || ref) === String(userId));

const validateBookingDate = (date) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setUTCDate(maxDate.getUTCDate() + bookingRules.maxAdvanceDays);

  if (date < today) {
    throw new ApiError(400, 'Appointment date cannot be in the past');
  }
  if (date > maxDate) {
    throw new ApiError(400, `Appointments can only be booked up to ${bookingRules.maxAdvanceDays} days in advance`);
  }
};

const assertLeadTime = (appointment, leadHours, action) => {
  const start = new Date(`${dateString(appointment.date)}T${appointment.startTime}:00`);
  const hoursLeft = (start.getTime() - Date.now()) / 3600000;
  if (hoursLeft < leadHours) {
    throw new ApiError(
      400,
      `${action} is only allowed at least ${leadHours} hours before the appointment start time`
    );
  }
};

const assertActive = (appointment, action) => {
  if (!['scheduled', 'rescheduled'].includes(appointment.status)) {
    throw new ApiError(400, `Only active appointments can be ${action}`);
  }
};

const isDuplicateKeyError = (err) => err && err.code === 11000;

const notifyOtherParty = async (appointment, currentUserId, title, message) => {
  const otherId = String(appointment.patient._id || appointment.patient) === String(currentUserId)
    ? appointment.doctor
    : appointment.patient;
  await notifyUser(otherId, 'appointment', title, message, appointment._id);
};

const book = asyncHandler(async (req, res) => {
  const { doctor, date, startTime, endTime, reason } = req.body;
  const appointmentDate = new Date(date);

  const profile = await DoctorProfile.findOne({
    user: doctor,
    verificationStatus: 'verified',
  });
  if (!profile) {
    throw new ApiError(400, 'Doctor is not available for booking');
  }

  validateBookingDate(appointmentDate);

  const expectedEnd = addMinutes(startTime, bookingRules.slotMinutes);
  if (endTime !== expectedEnd) {
    throw new ApiError(400, `Each slot is ${bookingRules.slotMinutes} minutes; endTime must be ${expectedEnd}`);
  }

  await assertSlotAvailable(doctor, appointmentDate, startTime, endTime);

  let appointment;
  try {
    appointment = await Appointment.create({
      patient: req.user._id,
      doctor,
      date: appointmentDate,
      startTime,
      endTime,
      reason,
      status: 'scheduled',
      consultationFee: profile.consultationFee || 0,
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new ApiError(409, 'This slot was just booked by someone else. Please choose another slot.');
    }
    throw err;
  }

  const payment = await initiateForAppointment(appointment);
  appointment.paymentStatus = payment.status;
  await appointment.save();

  const patient = await User.findById(req.user._id).select('name');
  const doctorUser = await User.findById(profile.user).select('name');
  const populated = { ...appointment.toObject(), patient, doctor: doctorUser };
  await notifyAppointmentConfirmed(populated);

  res.status(201).json({ success: true, data: appointment });
});

const getMyAppointments = asyncHandler(async (req, res) => {
  const filter = { $or: [{ patient: req.user._id }, { doctor: req.user._id }] };
  if (req.query.status) {
    filter.status = req.query.status;
  }
  const data = await Appointment.find(filter)
    .populate('patient', 'name email phone')
    .populate('doctor', 'name')
    .sort({ date: -1, startTime: -1 });

  const doctorIds = [...new Set(data.map((a) => String(a.doctor._id || a.doctor)))];
  const profiles = await DoctorProfile.find({ user: { $in: doctorIds } }).select('user');
  const profileByUser = new Map(profiles.map((p) => [String(p.user), p._id]));

  const withProfile = data.map((a) => ({
    ...a.toObject(),
    doctorProfileId: profileByUser.get(String(a.doctor._id || a.doctor)) || null,
  }));

  res.json({ success: true, data: withProfile });
});

const getById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'name email phone')
    .populate('doctor', 'name');
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }
  // populate() yields null when the referenced user was deleted
  const isParticipant = isParticipantId(appointment, req.user._id);
  if (!isParticipant && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed to view this appointment');
  }
  res.json({ success: true, data: appointment });
});

const cancel = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', '_id name')
    .populate('doctor', '_id name');
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  const isPatient = isParticipantId(appointment, req.user._id) && String(appointment.patient._id || appointment.patient) === String(req.user._id);
  const isDoctor = isParticipantId(appointment, req.user._id) && String(appointment.doctor._id || appointment.doctor) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (!isPatient && !isDoctor && !isAdmin) {
    throw new ApiError(403, 'Not allowed to cancel this appointment');
  }

  assertActive(appointment, 'cancelled');
  if (!isAdmin) {
    assertLeadTime(appointment, bookingRules.cancelLeadHours, 'Cancellation');
  }

  appointment.status = 'cancelled';
  await appointment.save();

  await notifyAppointmentCancelled(appointment, req.user._id);
  await refundForAppointment(appointment);

  res.json({ success: true, data: appointment });
});

const reschedule = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', '_id name')
    .populate('doctor', '_id name');
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  const isPatient = isParticipantId(appointment, req.user._id) && String(appointment.patient._id || appointment.patient) === String(req.user._id);
  if (!isPatient && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only the patient can reschedule this appointment');
  }

  assertActive(appointment, 'rescheduled');
  if (req.user.role !== 'admin') {
    assertLeadTime(appointment, bookingRules.rescheduleLeadHours, 'Rescheduling');
  }
  if (appointment.rescheduleCount >= bookingRules.maxReschedules) {
    throw new ApiError(
      400,
      `Appointments can be rescheduled at most ${bookingRules.maxReschedules} times`
    );
  }

  const newDate = new Date(req.body.date);
  validateBookingDate(newDate);

  if (dateString(newDate) === dateString(appointment.date) && req.body.startTime === appointment.startTime) {
    throw new ApiError(400, 'Choose a different slot than the current one');
  }

  const expectedEnd = addMinutes(req.body.startTime, bookingRules.slotMinutes);
  if (req.body.endTime !== expectedEnd) {
    throw new ApiError(400, `Each slot is ${bookingRules.slotMinutes} minutes; endTime must be ${expectedEnd}`);
  }

  await assertSlotAvailable(appointment.doctor, newDate, req.body.startTime, req.body.endTime);

  appointment.date = newDate;
  appointment.startTime = req.body.startTime;
  appointment.endTime = req.body.endTime;
  appointment.status = 'rescheduled';
  appointment.rescheduleCount += 1;
  try {
    await appointment.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new ApiError(409, 'The new slot was just booked by someone else. Please choose another slot.');
    }
    throw err;
  }

  await notifyAppointmentRescheduled(appointment);

  res.json({ success: true, data: appointment });
});

const updateStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', '_id name')
    .populate('doctor', '_id name');
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  const isPatient = isParticipantId(appointment, req.user._id) && String(appointment.patient._id || appointment.patient) === String(req.user._id);
  const isDoctor = isParticipantId(appointment, req.user._id) && String(appointment.doctor._id || appointment.doctor) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (!isPatient && !isDoctor && !isAdmin) {
    throw new ApiError(403, 'Not allowed to modify this appointment');
  }

  const actorRole = isAdmin ? 'admin' : isDoctor ? 'doctor' : 'patient';
  const from = appointment.status;
  const to = req.body.status;
  if (from === to) {
    throw new ApiError(400, 'Appointment already has this status');
  }
  if (!canTransition(actorRole, from, to)) {
    throw new ApiError(400, `Cannot change status from ${from} to ${to} as ${actorRole}`);
  }

  // A patient cancelling through the generic status endpoint must not be able to
  // skip the lead-time rule or keep the refund — enforce the same rules as cancel().
  if (to === 'cancelled') {
    assertActive(appointment, 'cancelled');
    if (!isAdmin) {
      assertLeadTime(appointment, bookingRules.cancelLeadHours, 'Cancellation');
    }
  }

  appointment.status = to;
  await appointment.save();

  if (to === 'cancelled') {
    await refundForAppointment(appointment);
  }

  const message = `Your appointment on ${dateString(appointment.date)} at ${appointment.startTime} is now ${to}.`;
  if (isAdmin) {
    await notifyUser(appointment.patient, 'appointment', `Appointment ${to}`, message, appointment._id);
    await notifyUser(appointment.doctor, 'appointment', `Appointment ${to}`, message, appointment._id);
  } else {
    await notifyOtherParty(appointment, req.user._id, `Appointment ${to}`, message);
  }

  res.json({ success: true, data: appointment });
});

const getVideoRoom = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }
  const isParticipant =
    String(appointment.patient) === String(req.user._id) ||
    String(appointment.doctor) === String(req.user._id);
  if (!isParticipant && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed to join this video room');
  }
  if (!['scheduled', 'rescheduled'].includes(appointment.status)) {
    throw new ApiError(400, 'Video consultations are only available for active appointments');
  }

  if (!appointment.videoRoomId) {
    Object.assign(appointment, createVideoRoom(appointment));
    await appointment.save();
  }

  res.json({
    success: true,
    data: {
      appointmentId: appointment._id,
      videoRoomId: appointment.videoRoomId,
      videoRoomUrl: appointment.videoRoomUrl,
      videoExpiresAt: appointment.videoExpiresAt,
      canJoin: canJoin(appointment),
      openInMs: openIn(appointment),
      startTime: appointment.startTime,
      date: appointment.date,
    },
  });
});

const adminList = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.doctorId) {
    filter.doctor = req.query.doctorId;
  }
  if (req.query.patientId) {
    filter.patient = req.query.patientId;
  }
  if (req.query.from) {
    filter.date = { $gte: new Date(req.query.from) };
  }
  if (req.query.to) {
    filter.date = { ...(filter.date || {}), $lte: new Date(req.query.to) };
  }

  const [data, total] = await Promise.all([
    Appointment.find(filter)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name')
      .sort({ date: -1, startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Appointment.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data,
    total,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

module.exports = {
  book,
  getMyAppointments,
  getById,
  cancel,
  reschedule,
  updateStatus,
  adminList,
  getVideoRoom,
  bookValidation,
  rescheduleValidation,
  statusValidation,
  adminListValidation,
};