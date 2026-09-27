const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9\s()-]{7,15}$/, 'Please provide a valid phone number'],
    },
    relation: {
      type: String,
      trim: true,
      maxlength: [50, 'Relation cannot exceed 50 characters'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },
  },
  { _id: false }
);

const patientProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    dob: {
      type: Date,
      validate: {
        validator: (v) => !v || v <= new Date(),
        message: 'Date of birth cannot be in the future',
      },
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other', 'prefer not to say'],
        message: '{VALUE} is not a valid gender',
      },
      default: 'prefer not to say',
    },
    bloodGroup: {
      type: String,
      enum: {
        values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        message: '{VALUE} is not a valid blood group',
      },
    },
    heightCm: {
      type: Number,
      min: [50, 'Height must be at least 50 cm'],
      max: [300, 'Height cannot exceed 300 cm'],
    },
    weightKg: {
      type: Number,
      min: [2, 'Weight must be at least 2 kg'],
      max: [500, 'Weight cannot exceed 500 kg'],
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    currentMedications: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      type: emergencyContactSchema,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PatientProfile', patientProfileSchema);