const { body, param } = require('express-validator');
const PatientProfile = require('../models/PatientProfile');
const HealthLog = require('../models/HealthLog');
const Prescription = require('../models/Prescription');
const SymptomSearch = require('../models/SymptomSearch');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');

const profileValidation = [
  body('dob').optional({ nullable: true }).isISO8601().withMessage('Valid date of birth required'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer not to say'])
    .withMessage('Invalid gender'),
  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood group'),
  body('heightCm').optional({ nullable: true }).isFloat({ min: 50, max: 300 }),
  body('weightKg').optional({ nullable: true }).isFloat({ min: 2, max: 500 }),
  body('allergies').optional().isArray({ max: 20 }),
  body('allergies.*').optional().trim().isLength({ max: 100 }),
  body('chronicConditions').optional().isArray({ max: 20 }),
  body('chronicConditions.*').optional().trim().isLength({ max: 100 }),
  body('currentMedications').optional().isArray({ max: 20 }),
  body('currentMedications.*').optional().trim().isLength({ max: 100 }),
  body('emergencyContact').optional().isObject(),
  body('emergencyContact.name').optional().trim().isLength({ max: 100 }),
  body('emergencyContact.phone').optional().isString().isLength({ max: 20 }),
  body('emergencyContact.relation').optional().trim().isLength({ max: 50 }),
  body('emergencyContact.address').optional().trim().isLength({ max: 300 }),
  validate,
];

const vitalValidation = [
  body('type')
    .isIn(['blood_pressure', 'heart_rate', 'temperature', 'weight', 'blood_sugar'])
    .withMessage('Invalid vital type'),
  body('value').optional({ nullable: true }).isFloat().withMessage('Numeric value required for this vital type'),
  body('systolic').optional({ nullable: true }).isFloat({ min: 30, max: 300 }),
  body('diastolic').optional({ nullable: true }).isFloat({ min: 20, max: 250 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('recordedAt').optional().isISO8601().withMessage('Valid recordedAt required'),
  validate,
];

const idValidation = [param('id').isMongoId().withMessage('Invalid id'), validate];

const getProfile = asyncHandler(async (req, res) => {
  const profile = await PatientProfile.findOne({ user: req.user._id });
  res.json({ success: true, data: profile || null });
});

const upsertProfile = asyncHandler(async (req, res) => {
  const allowed = [
    'dob',
    'gender',
    'bloodGroup',
    'heightCm',
    'weightKg',
    'allergies',
    'chronicConditions',
    'currentMedications',
    'emergencyContact',
  ];
  const update = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) {
      update[key] = req.body[key];
    }
  });

  const profile = await PatientProfile.findOneAndUpdate(
    { user: req.user._id },
    update,
    { new: true, upsert: true, runValidators: true }
  );
  res.json({ success: true, data: profile });
});

const addVital = asyncHandler(async (req, res) => {
  const { type, value, systolic, diastolic, notes, recordedAt } = req.body;
  const entry = { user: req.user._id, type, notes: notes || '' };

  if (type === 'blood_pressure') {
    if (systolic === undefined || diastolic === undefined) {
      throw new ApiError(400, 'Blood pressure requires systolic and diastolic values');
    }
    entry.systolic = systolic;
    entry.diastolic = diastolic;
    entry.unit = 'mmHg';
  } else {
    if (value === undefined) {
      throw new ApiError(400, 'A numeric value is required for this vital type');
    }
    entry.value = value;
    entry.unit =
      type === 'temperature' ? '°C' : type === 'heart_rate' ? 'bpm' : type === 'weight' ? 'kg' : 'mg/dL';
  }

  if (recordedAt) entry.recordedAt = new Date(recordedAt);

  const saved = await HealthLog.create(entry);
  res.status(201).json({ success: true, data: saved.toPublicJSON() });
});

const getVitals = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
  const vitals = await HealthLog.find({ user: req.user._id })
    .sort({ recordedAt: -1 })
    .limit(limit);
  res.json({ success: true, data: vitals.map((v) => v.toPublicJSON()) });
});

const deleteVital = asyncHandler(async (req, res) => {
  const vital = await HealthLog.findOne({ _id: req.params.id, user: req.user._id });
  if (!vital) {
    throw new ApiError(404, 'Vital entry not found');
  }
  await vital.deleteOne();
  res.json({ success: true, data: { message: 'Vital entry deleted' } });
});

const getTimeline = asyncHandler(async (req, res) => {
  const [searches, vitals, prescriptions] = await Promise.all([
    SymptomSearch.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    HealthLog.find({ user: req.user._id })
      .sort({ recordedAt: -1 })
      .limit(50)
      .lean(),
    Prescription.find({ patient: req.user._id, status: 'active' })
      .sort({ issuedAt: -1 })
      .limit(30)
      .populate('doctor', 'name')
      .lean(),
  ]);

  const entries = [];
  searches.forEach((s) =>
    entries.push({
      id: `search-${s._id}`,
      type: 'symptom',
      date: s.createdAt,
      title: (s.symptoms || []).join(', '),
      meta: {
        severity: s.severity,
        urgency: s.result?.urgencyLevel || null,
        recommendedSpecialty: s.result?.recommendedSpecialty || null,
        durationInDays: s.durationInDays,
      },
    })
  );
  vitals.forEach((v) =>
    entries.push({
      id: `vital-${v._id}`,
      type: 'vital',
      date: v.recordedAt,
      title: v.type.replace(/_/g, ' '),
      meta: {
        value: v.type === 'blood_pressure' ? `${v.systolic}/${v.diastolic}` : v.value,
        unit: v.unit,
      },
    })
  );
  prescriptions.forEach((p) =>
    entries.push({
      id: `prescription-${p._id}`,
      type: 'prescription',
      date: p.issuedAt,
      title: 'Prescription',
      meta: {
        doctor: p.doctor?.name || null,
        medicineCount: (p.medicines || []).length,
      },
    })
  );

  entries.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    success: true,
    data: { entries, counts: { symptoms: searches.length, vitals: vitals.length, prescriptions: prescriptions.length } },
  });
});

module.exports = {
  getProfile,
  upsertProfile,
  addVital,
  getVitals,
  deleteVital,
  getTimeline,
  profileValidation,
  vitalValidation,
  idValidation,
};