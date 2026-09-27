const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
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
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'Appointment reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      uppercase: true,
      default: 'INR',
      maxlength: [3, 'Currency must be a 3-letter code'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'refunded', 'failed'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'pending',
    },
    method: {
      type: String,
      enum: {
        values: ['mock', 'card', 'upi', 'cash', 'netbanking'],
        message: '{VALUE} is not a valid payment method',
      },
      default: 'mock',
    },
    transactionId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      default: 'Consultation fee',
    },
  },
  { timestamps: true }
);

paymentSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);