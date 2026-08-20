const mongoose = require('mongoose');

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor reference is required'],
    },
    dayOfWeek: {
      type: Number,
      required: [true, 'Day of week is required'],
      min: [0, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'],
      max: [6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [TIME_PATTERN, 'Start time must be in HH:MM 24-hour format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [TIME_PATTERN, 'End time must be in HH:MM 24-hour format'],
      validate: {
        validator: function (v) {
          return !this.startTime || v > this.startTime;
        },
        message: 'End time must be after start time',
      },
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

doctorAvailabilitySchema.index(
  { doctor: 1, dayOfWeek: 1, startTime: 1 },
  { unique: true }
);
doctorAvailabilitySchema.index({ doctor: 1, dayOfWeek: 1, isAvailable: 1 });

module.exports = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);
