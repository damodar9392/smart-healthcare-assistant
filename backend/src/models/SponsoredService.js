const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: [true, 'Location coordinates are required'],
      validate: {
        validator: (v) =>
          Array.isArray(v) &&
          v.length === 2 &&
          v[0] >= -180 &&
          v[0] <= 180 &&
          v[1] >= -90 &&
          v[1] <= 90,
        message: 'Coordinates must be [longitude, latitude] within valid ranges',
      },
    },
  },
  { _id: false }
);

const sponsoredServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [200, 'Service name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: {
        values: [
          'pharmacy',
          'diagnostics',
          'checkup',
          'insurance',
          'consultation',
          'clinic',
          'wellness',
          'emergency',
          'other',
        ],
        message: '{VALUE} is not a valid service category',
      },
      default: 'other',
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    location: {
      type: locationSchema,
      required: [true, 'Service location is required'],
    },
    contact: {
      phone: {
        type: String,
        match: [/^\+?[0-9\s()-]{7,15}$/, 'Please provide a valid phone number'],
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
      },
      website: {
        type: String,
        trim: true,
      },
    },
    sponsor: {
      type: String,
      trim: true,
    },
    isSponsored: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

sponsoredServiceSchema.index({ location: '2dsphere' });
sponsoredServiceSchema.index({ isActive: 1, category: 1 });

module.exports = mongoose.model('SponsoredService', sponsoredServiceSchema);
