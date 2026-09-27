const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hospital or clinic name is required'],
      trim: true,
    },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
  },
  { _id: false }
);

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

const verificationHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: {
        values: ['pending', 'verified', 'rejected'],
        message: '{VALUE} is not a valid verification status',
      },
      required: [true, 'History entry status is required'],
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const verificationDetailsSchema = new mongoose.Schema(
  {
    licenseNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'License number cannot exceed 100 characters'],
    },
    issuingAuthority: {
      type: String,
      trim: true,
      maxlength: [200, 'Issuing authority cannot exceed 200 characters'],
    },
    submittedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor user reference is required'],
      unique: true,
    },
    profilePhoto: {
      type: String,
      trim: true,
      maxlength: [500, 'Profile photo URL cannot exceed 500 characters'],
      default: '',
    },
    qualification: {
      type: [String],
      required: [true, 'At least one qualification is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one qualification is required',
      },
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
    },
    experience: {
      type: Number,
      required: [true, 'Years of experience is required'],
      min: [0, 'Experience cannot be negative'],
      max: [70, 'Experience cannot exceed 70 years'],
    },
    hospital: {
      type: hospitalSchema,
      required: [true, 'Hospital or clinic affiliation is required'],
    },
    consultationFee: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Consultation fee cannot be negative'],
    },
    location: {
      type: locationSchema,
      required: [true, 'Practice location is required'],
    },
    about: {
      type: String,
      trim: true,
      maxlength: [1000, 'About cannot exceed 1000 characters'],
      default: '',
    },
    verificationDetails: {
      type: verificationDetailsSchema,
      default: {},
    },
    verificationStatus: {
      type: String,
      enum: {
        values: ['pending', 'verified', 'rejected'],
        message: '{VALUE} is not a valid verification status',
      },
      default: 'pending',
    },
    verificationHistory: {
      type: [verificationHistorySchema],
      default: [],
    },
    rating: {
      type: Number,
      min: [0, 'Rating cannot be below 0'],
      max: [5, 'Rating cannot exceed 5'],
      default: 0,
    },
    ratingCount: {
      type: Number,
      min: [0, 'Rating count cannot be negative'],
      default: 0,
    },
  },
  { timestamps: true }
);

doctorProfileSchema.index({ location: '2dsphere' });
doctorProfileSchema.index({ verificationStatus: 1, specialization: 1 });
doctorProfileSchema.index({ verificationStatus: 1, createdAt: -1 });
doctorProfileSchema.index({ specialization: 1, rating: -1 });
doctorProfileSchema.index({ 'hospital.city': 1 });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
