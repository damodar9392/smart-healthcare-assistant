const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      minlength: [8, 'Password hash must be at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^\+?[0-9\s()-]{7,15}$/, 'Please provide a valid phone number'],
    },
    role: {
      type: String,
      enum: {
        values: ['patient', 'doctor', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'patient',
    },
    pushSubscriptions: {
      type: [
        {
          endpoint: {
            type: String,
            required: true,
            trim: true,
          },
          keys: {
            p256dh: { type: String, trim: true },
            auth: { type: String, trim: true },
          },
          userAgent: { type: String, default: null },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
