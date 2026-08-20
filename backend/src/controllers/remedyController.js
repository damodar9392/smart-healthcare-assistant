const TemporaryRemedy = require('../models/TemporaryRemedy');
const Symptom = require('../models/Symptom');
const { notifyUser, notifyAdmins } = require('../services/notificationService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const writeValidation = [
  body('symptoms')
    .isArray({ min: 1 })
    .withMessage('At least one symptom reference is required'),
  body('symptoms.*').isMongoId().withMessage('Symptom references must be valid ids'),
  body('probableConditionCategory')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('probableConditionCategory must be 3-200 characters'),
  body('recommendedSpecialty')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('recommendedSpecialty must be 2-200 characters'),
  body('safeTemporaryGuidance')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('safeTemporaryGuidance must be 10-2000 characters'),
  body('precautions').optional().isArray().withMessage('precautions must be an array'),
  body('avoid').optional().isArray().withMessage('avoid must be an array'),
  body('emergencyWarningSigns')
    .optional()
    .isArray()
    .withMessage('emergencyWarningSigns must be an array'),
  validate,
];

const approvalValidation = [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long'),
  validate,
];

const matchValidation = [
  body('symptoms')
    .isArray({ min: 1 })
    .withMessage('At least one symptom name is required'),
  body('symptoms.*')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Each symptom name must be 2-100 characters'),
  body('recommendedSpecialty')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('recommendedSpecialty must be 2-200 characters'),
  validate,
];

const normalize = (text) => String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();

const remedyId = (symptom) => (symptom._id ? symptom._id : symptom);

const scoreMatch = (remedy, symptomIds, specialty) => {
  let score = 0;
  let reason = null;

  const remedySpecialty = normalize(remedy.recommendedSpecialty);
  if (
    specialty &&
    remedySpecialty.length >= 3 &&
    (remedySpecialty.includes(specialty) || specialty.includes(remedySpecialty))
  ) {
    score += 2;
    reason = 'specialty';
  }

  const overlaps = symptomIds.filter((id) =>
    remedy.symptoms.some((s) => String(remedyId(s)) === String(id))
  );
  if (overlaps.length > 0) {
    score += Math.min(overlaps.length, 3);
    reason = reason ? 'both' : 'symptom';
  }

  return { score, reason };
};

const match = asyncHandler(async (req, res) => {
  const inputSymptoms = req.body.symptoms.map(normalize).filter(Boolean);
  const specialty = normalize(req.body.recommendedSpecialty);

  const symptomDocs = await Symptom.find({ name: { $in: inputSymptoms } }).select('_id name');
  const symptomIds = symptomDocs.map((s) => String(s._id));

  const orClauses = [];
  if (symptomIds.length > 0) {
    orClauses.push({ symptoms: { $in: symptomIds } });
  }
  if (specialty) {
    orClauses.push({
      recommendedSpecialty: new RegExp(escapeRegex(specialty), 'i'),
    });
  }

  const candidates =
    orClauses.length === 0
      ? []
      : await TemporaryRemedy.find({ approvalStatus: 'approved', $or: orClauses })
          .limit(100)
          .populate('symptoms', 'name')
          .populate('doctor', 'name')
          .populate('approval.approvedBy', 'name');

  const ranked = candidates
    .map((remedy) => ({ remedy, ...scoreMatch(remedy, symptomIds, specialty) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.remedy.createdAt) - new Date(a.remedy.createdAt))
    .slice(0, 5)
    .map(({ remedy, score, reason }) => ({
      ...remedy.toObject(),
      matchScore: score,
      matchReason: reason,
    }));

  res.json({ success: true, data: ranked });
});

const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'patient') {
    filter.approvalStatus = 'approved';
  } else if (req.user.role === 'doctor') {
    filter.$or = [{ doctor: req.user._id }, { approvalStatus: 'approved' }];
  }
  if (req.query.symptom) {
    filter.symptoms = req.query.symptom;
  }
  if (req.query.mine === 'true' && req.user.role === 'doctor') {
    filter.doctor = req.user._id;
  }
  if (req.query.specialty) {
    filter.recommendedSpecialty = new RegExp(escapeRegex(req.query.specialty), 'i');
  }
  if (req.query.category) {
    filter.probableConditionCategory = new RegExp(escapeRegex(req.query.category), 'i');
  }
  if (req.query.approvalStatus && req.user.role !== 'patient') {
    filter.approvalStatus = req.query.approvalStatus;
  }
  const data = await TemporaryRemedy.find(filter)
    .populate('symptoms', 'name')
    .populate('doctor', 'name')
    .populate('approval.approvedBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, data });
});

const getById = asyncHandler(async (req, res) => {
  const remedy = await TemporaryRemedy.findById(req.params.id)
    .populate('symptoms', 'name')
    .populate('doctor', 'name')
    .populate('approval.approvedBy', 'name');
  if (!remedy) {
    throw new ApiError(404, 'Remedy not found');
  }
  const isOwner = remedy.doctor._id.equals(req.user._id);
  if (req.user.role === 'patient' && remedy.approvalStatus !== 'approved') {
    throw new ApiError(404, 'Remedy not found');
  }
  if (req.user.role === 'doctor' && !isOwner && remedy.approvalStatus !== 'approved') {
    throw new ApiError(404, 'Remedy not found');
  }
  res.json({ success: true, data: remedy });
});

const create = asyncHandler(async (req, res) => {
  const remedy = await TemporaryRemedy.create({ ...req.body, doctor: req.user._id });
  await notifyAdmins(
    'remedy',
    'New remedy submitted',
    `${req.user.name} submitted a new temporary remedy for review`,
    remedy._id
  );
  res.status(201).json({ success: true, data: remedy });
});

const update = asyncHandler(async (req, res) => {
  const remedy = await TemporaryRemedy.findById(req.params.id);
  if (!remedy) {
    throw new ApiError(404, 'Remedy not found');
  }
  const isOwner = remedy.doctor.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed to edit this remedy');
  }
  if (isOwner && remedy.approvalStatus === 'approved') {
    throw new ApiError(400, 'Approved remedies cannot be edited by the submitting doctor');
  }
  Object.assign(remedy, req.body);
  await remedy.save();
  res.json({ success: true, data: remedy });
});

const setApproval = async (req, remedy, status, notes) => {
  remedy.approvalStatus = status;
  remedy.approval = {
    approvedBy: req.user._id,
    approvedAt: new Date(),
    notes: notes || '',
  };
  await remedy.save();
  await notifyUser(
    remedy.doctor,
    'remedy',
    `Remedy ${status}`,
    `Your remedy "${remedy.probableConditionCategory}" was ${status}`,
    remedy._id
  );
  return remedy;
};

const approve = asyncHandler(async (req, res) => {
  const remedy = await TemporaryRemedy.findById(req.params.id);
  if (!remedy) {
    throw new ApiError(404, 'Remedy not found');
  }
  const updated = await setApproval(req, remedy, req.body.status, req.body.notes);
  res.json({ success: true, data: updated });
});

const approveRemedy = asyncHandler(async (req, res) => {
  const remedy = await TemporaryRemedy.findById(req.params.id);
  if (!remedy) {
    throw new ApiError(404, 'Remedy not found');
  }
  if (remedy.approvalStatus === 'approved') {
    throw new ApiError(400, 'Remedy is already approved');
  }
  const updated = await setApproval(req, remedy, 'approved', req.body.notes);
  res.json({ success: true, data: updated });
});

const rejectRemedy = asyncHandler(async (req, res) => {
  const remedy = await TemporaryRemedy.findById(req.params.id);
  if (!remedy) {
    throw new ApiError(404, 'Remedy not found');
  }
  if (remedy.approvalStatus === 'rejected') {
    throw new ApiError(400, 'Remedy is already rejected');
  }
  const updated = await setApproval(req, remedy, 'rejected', req.body.notes);
  res.json({ success: true, data: updated });
});

const pendingList = asyncHandler(async (req, res) => {
  const data = await TemporaryRemedy.find({ approvalStatus: 'pending' })
    .populate('symptoms', 'name')
    .populate('doctor', 'name')
    .populate('approval.approvedBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, data });
});

const remove = asyncHandler(async (req, res) => {
  const remedy = await TemporaryRemedy.findById(req.params.id);
  if (!remedy) {
    throw new ApiError(404, 'Remedy not found');
  }
  const isOwner = remedy.doctor.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed to delete this remedy');
  }
  if (isOwner && remedy.approvalStatus === 'approved') {
    throw new ApiError(400, 'Approved remedies cannot be deleted by the submitting doctor');
  }
  await remedy.deleteOne();
  res.json({ success: true, message: 'Remedy deleted' });
});

module.exports = {
  list,
  getById,
  create,
  update,
  approve,
  approveRemedy,
  rejectRemedy,
  pendingList,
  match,
  remove,
  writeValidation,
  approvalValidation,
  matchValidation,
};
