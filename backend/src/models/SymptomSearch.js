const mongoose = require('mongoose');

const symptomSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    symptoms: {
      type: [String],
      required: [true, 'At least one main symptom is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one main symptom is required',
      },
    },
    additionalSymptoms: {
      type: [String],
      default: [],
    },
    durationInDays: {
      type: Number,
      required: [true, 'Duration in days is required'],
      min: [1, 'Duration must be at least 1 day'],
      max: [365, 'Duration cannot exceed 365 days'],
    },
    severity: {
      type: String,
      enum: {
        values: ['mild', 'moderate', 'severe'],
        message: '{VALUE} is not a valid severity level',
      },
      required: [true, 'Severity is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    result: {
      recommendedSpecialty: { type: String, trim: true },
      urgencyLevel: {
        type: String,
        enum: {
          values: ['low', 'medium', 'high', 'emergency'],
          message: '{VALUE} is not a valid urgency level',
        },
      },
      confidenceScore: {
        type: Number,
        min: [0, 'Confidence cannot be below 0'],
        max: [1, 'Confidence cannot exceed 1'],
      },
      summary: { type: String, trim: true },
      message: { type: String, trim: true },
      showTemporaryGuidance: { type: Boolean, default: true },
      matchedRules: [
        {
          id: { type: String, trim: true },
          phrase: { type: String, trim: true },
          urgency: { type: String, trim: true },
          _id: false,
        },
      ],
    },
  },
  { timestamps: true }
);

symptomSearchSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SymptomSearch', symptomSearchSchema);