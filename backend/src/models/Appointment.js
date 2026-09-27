const mongoose = require('mongoose');

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Appointment date is required'],
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
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
        message: '{VALUE} is not a valid appointment status',
      },
      default: 'scheduled',
    },
    rescheduleCount: {
      type: Number,
      default: 0,
      min: [0, 'Reschedule count cannot be negative'],
    },
    reason: {
      type: String,
      required: [true, 'Appointment reason is required'],
      trim: true,
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },
    consultationFee: {
      type: Number,
      min: [0, 'Consultation fee cannot be negative'],
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['unpaid', 'pending', 'paid', 'refunded'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'unpaid',
    },
    videoRoomId: {
      type: String,
      trim: true,
      default: null,
    },
    videoRoomUrl: {
      type: String,
      trim: true,
      default: null,
    },
    videoCreatedAt: {
      type: Date,
      default: null,
    },
    videoExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

appointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['scheduled', 'rescheduled'] } } }
);
appointmentSchema.index({ doctor: 1, date: 1, status: 1 });
appointmentSchema.index({ patient: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
