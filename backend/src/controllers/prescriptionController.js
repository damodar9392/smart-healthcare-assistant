const { body, param } = require('express-validator');
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const { notifyUser } = require('../services/notificationService');
const { encrypt, decrypt } = require('../utils/encryption');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');

const serialize = (prescription) => {
  if (!prescription) return null;
  const doc = prescription.toObject ? prescription.toObject() : prescription;
  return {
    ...doc,
    diagnosis: decrypt(doc.diagnosis) || '',
    advice: decrypt(doc.advice) || '',
    medicines: (doc.medicines || []).map((m) => ({
      ...m,
      notes: decrypt(m.notes) || '',
    })),
  };
};

const createValidation = [
  body('appointment').isMongoId().withMessage('Valid appointment id required'),
  body('diagnosis')
    .trim()
    .isLength({ min: 2, max: 2000 })
    .withMessage('Diagnosis must be 2-2000 characters'),
  body('medicines')
    .isArray({ min: 1, max: 20 })
    .withMessage('At least one medicine is required'),
  body('medicines.*.name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Medicine name must be 1-100 characters'),
  body('medicines.*.dosage').optional().trim().isLength({ max: 100 }),
  body('medicines.*.frequency').optional().trim().isLength({ max: 100 }),
  body('medicines.*.durationDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Duration must be 1-365 days'),
  body('medicines.*.notes').optional().trim().isLength({ max: 500 }),
  body('advice').optional().trim().isLength({ max: 2000 }).withMessage('Advice cannot exceed 2000 characters'),
  body('followUpDays').optional().isInt({ min: 0, max: 365 }),
  validate,
];

const updateValidation = [
  body('diagnosis').optional().trim().isLength({ min: 2, max: 2000 }),
  body('medicines')
    .optional()
    .isArray({ max: 20 })
    .withMessage('At most 20 medicines allowed'),
  body('medicines.*.name').optional().trim().isLength({ min: 1, max: 100 }),
  body('medicines.*.dosage').optional().trim().isLength({ max: 100 }),
  body('medicines.*.frequency').optional().trim().isLength({ max: 100 }),
  body('medicines.*.durationDays').optional().isInt({ min: 1, max: 365 }),
  body('medicines.*.notes').optional().trim().isLength({ max: 500 }),
  body('advice').optional().trim().isLength({ max: 2000 }),
  body('followUpDays').optional().isInt({ min: 0, max: 365 }),
  validate,
];

const idValidation = [param('id').isMongoId().withMessage('Invalid prescription id'), validate];

const create = asyncHandler(async (req, res) => {
  const { appointment: appointmentId, diagnosis, medicines, advice, followUpDays } = req.body;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }
  const isDoctor = String(appointment.doctor) === String(req.user._id);
  if (!isDoctor && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only the appointment doctor can write prescriptions');
  }
  if (!['scheduled', 'rescheduled', 'completed'].includes(appointment.status)) {
    throw new ApiError(400, 'Prescriptions can only be issued for active or completed appointments');
  }

  const existing = await Prescription.findOne({
    appointment: appointmentId,
    status: 'active',
  });
  if (existing) {
    throw new ApiError(
      409,
      'A prescription already exists for this appointment. Update it instead of creating a new one.'
    );
  }

  const encryptedMedicines = (medicines || []).map((m) => ({
    name: m.name,
    dosage: m.dosage || '',
    frequency: m.frequency || '',
    durationDays: m.durationDays,
    notes: encrypt(m.notes),
  }));

  let prescription;
  try {
    prescription = await Prescription.create({
      patient: appointment.patient,
      doctor: appointment.doctor,
      appointment: appointmentId,
      symptoms: appointment.reason ? [appointment.reason] : [],
      diagnosis: encrypt(diagnosis),
      medicines: encryptedMedicines,
      advice: encrypt(advice || ''),
      followUpDays: followUpDays || 0,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      throw new ApiError(409, 'A prescription already exists for this appointment');
    }
    throw err;
  }

  await notifyUser(
    appointment.patient,
    'appointment',
    'New prescription available',
    `Dr. ${req.user.name} issued a new prescription for your appointment.`
  );

  res.status(201).json({ success: true, data: serialize(prescription) });
});

const update = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) {
    throw new ApiError(404, 'Prescription not found');
  }
  const isDoctor = String(prescription.doctor) === String(req.user._id);
  if (!isDoctor && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only the issuing doctor can update this prescription');
  }

  const updates = {};
  if (req.body.diagnosis !== undefined) updates.diagnosis = encrypt(req.body.diagnosis);
  if (req.body.medicines !== undefined) {
    updates.medicines = (req.body.medicines || []).map((m) => ({
      name: m.name,
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      durationDays: m.durationDays,
      notes: encrypt(m.notes),
    }));
  }
  if (req.body.advice !== undefined) updates.advice = encrypt(req.body.advice || '');
  if (req.body.followUpDays !== undefined) updates.followUpDays = req.body.followUpDays;
  if (req.body.symptoms !== undefined) updates.symptoms = req.body.symptoms;

  Object.assign(prescription, updates);
  await prescription.save();

  res.json({ success: true, data: serialize(prescription) });
});

const getForAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.appointmentId);
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }
  const isParticipant =
    String(appointment.patient) === String(req.user._id) ||
    String(appointment.doctor) === String(req.user._id);
  if (!isParticipant && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed to view this prescription');
  }

  const prescription = await Prescription.findOne({
    appointment: appointment._id,
    status: 'active',
  })
    .populate('doctor', 'name')
    .populate('patient', 'name phone');

  res.json({ success: true, data: serialize(prescription) });
});

const getMine = asyncHandler(async (req, res) => {
  const prescriptions = await Prescription.find({ patient: req.user._id, status: 'active' })
    .populate('doctor', 'name')
    .populate('appointment', 'date startTime endTime')
    .sort({ issuedAt: -1 });

  res.json({
    success: true,
    data: prescriptions.map((p) => ({
      ...serialize(p),
      doctor: p.doctor,
      appointment: p.appointment,
    })),
  });
});

const getById = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('doctor', 'name')
    .populate('patient', 'name phone')
    .populate('appointment', 'date startTime endTime');
  if (!prescription) {
    throw new ApiError(404, 'Prescription not found');
  }
  const isParticipant =
    String(prescription.patient) === String(req.user._id) ||
    String(prescription.doctor) === String(req.user._id);
  if (!isParticipant && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed to view this prescription');
  }
  res.json({ success: true, data: serialize(prescription) });
});

const archive = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) {
    throw new ApiError(404, 'Prescription not found');
  }
  const isDoctor = String(prescription.doctor) === String(req.user._id);
  if (!isDoctor && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only the issuing doctor can archive this prescription');
  }
  prescription.status = 'archived';
  await prescription.save();
  res.json({ success: true, data: { message: 'Prescription archived' } });
});

module.exports = {
  create,
  update,
  getForAppointment,
  getMine,
  getById,
  archive,
  createValidation,
  updateValidation,
  idValidation,
};