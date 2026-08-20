const mongoose = require('mongoose');

const savedDoctorSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: [true, 'Doctor profile reference is required'],
    },
  },
  { timestamps: true }
);

savedDoctorSchema.index({ patient: 1, doctor: 1 }, { unique: true });

module.exports = mongoose.model('SavedDoctor', savedDoctorSchema);