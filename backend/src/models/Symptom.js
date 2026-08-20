const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Symptom name is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      enum: {
        values: [
          'general',
          'respiratory',
          'cardiovascular',
          'digestive',
          'neurological',
          'musculoskeletal',
          'dermatological',
          'ent',
          'eye',
          'psychiatric',
        ],
        message: '{VALUE} is not a valid symptom category',
      },
      required: [true, 'Symptom category is required'],
    },
    severityLevel: {
      type: String,
      enum: {
        values: ['mild', 'moderate', 'severe', 'critical'],
        message: '{VALUE} is not a valid severity level',
      },
      default: 'mild',
    },
    recommendedSpecialty: {
      type: String,
      trim: true,
    },
    relatedSymptoms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Symptom',
      },
    ],
  },
  { timestamps: true }
);

symptomSchema.index({ category: 1, severityLevel: 1 });
symptomSchema.index({ name: 1 });

module.exports = mongoose.model('Symptom', symptomSchema);
