const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      maxlength: [100, 'Medicine name cannot exceed 100 characters'],
    },
    dosage: {
      type: String,
      trim: true,
      maxlength: [100, 'Dosage cannot exceed 100 characters'],
      default: '',
    },
    frequency: {
      type: String,
      trim: true,
      maxlength: [100, 'Frequency cannot exceed 100 characters'],
      default: '',
    },
    durationDays: {
      type: Number,
      min: [1, 'Duration must be at least 1 day'],
      max: [365, 'Duration cannot exceed 365 days'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor reference is required'],
      index: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'Appointment reference is required'],
    },
    symptoms: {
      type: [String],
      default: [],
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    medicines: {
      type: [medicineSchema],
      default: [],
    },
    advice: {
      type: String,
      trim: true,
    },
    followUpDays: {
      type: Number,
      min: [0, 'Follow-up days cannot be negative'],
      max: [365, 'Follow-up days cannot exceed 365 days'],
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'archived'],
        message: '{VALUE} is not a valid prescription status',
      },
      default: 'active',
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

prescriptionSchema.index(
  { appointment: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);