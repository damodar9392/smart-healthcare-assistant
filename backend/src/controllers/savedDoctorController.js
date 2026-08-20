const SavedDoctor = require('../models/SavedDoctor');
const DoctorProfile = require('../models/DoctorProfile');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listMySaved = asyncHandler(async (req, res) => {
  const data = await SavedDoctor.find({ patient: req.user._id })
    .populate({
      path: 'doctor',
      select:
        'user profilePhoto specialization experience qualification hospital verificationStatus rating consultationFee',
      populate: { path: 'user', select: 'name' },
    })
    .sort({ createdAt: -1 });
  res.json({ success: true, data });
});

const saveDoctor = asyncHandler(async (req, res) => {
  const profile = await DoctorProfile.findById(req.params.id);
  if (!profile) {
    throw new ApiError(404, 'Doctor profile not found');
  }
  const existing = await SavedDoctor.findOne({
    patient: req.user._id,
    doctor: profile._id,
  });
  if (existing) {
    throw new ApiError(409, 'Doctor is already in your saved list');
  }
  const saved = await SavedDoctor.create({
    patient: req.user._id,
    doctor: profile._id,
  });
  res.status(201).json({ success: true, data: saved });
});

const removeSavedDoctor = asyncHandler(async (req, res) => {
  const removed = await SavedDoctor.findOneAndDelete({
    patient: req.user._id,
    doctor: req.params.id,
  });
  if (!removed) {
    throw new ApiError(404, 'Doctor is not in your saved list');
  }
  res.json({ success: true, message: 'Doctor removed from saved list' });
});

module.exports = { listMySaved, saveDoctor, removeSavedDoctor };