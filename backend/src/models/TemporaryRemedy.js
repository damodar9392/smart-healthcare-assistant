const mongoose = require('mongoose');

const temporaryRemedySchema = new mongoose.Schema(
  {
    symptoms: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Symptom',
        },
      ],
      required: [true, 'At least one symptom reference is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one symptom reference is required',
      },
    },
    probableConditionCategory: {
      type: String,
      required: [true, 'Probable condition category is required'],
      trim: true,
      maxlength: [200, 'Condition category cannot exceed 200 characters'],
    },
    recommendedSpecialty: {
      type: String,
      required: [true, 'Recommended specialty is required'],
      trim: true,
    },
    safeTemporaryGuidance: {
      type: String,
      required: [true, 'Safe temporary guidance is required'],
      trim: true,
      maxlength: [2000, 'Guidance cannot exceed 2000 characters'],
    },
    precautions: {
      type: [String],
      default: [],
    },
    avoid: {
      type: [String],
      default: [],
    },
    emergencyWarningSigns: {
      type: [String],
      default: [],
    },
    disclaimer: {
      type: String,
      default:
        'This is general educational guidance only and does not constitute a medical diagnosis. Consult a qualified doctor for an actual diagnosis.',
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Submitting doctor reference is required'],
    },
    approvalStatus: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: '{VALUE} is not a valid approval status',
      },
      default: 'pending',
    },
    approval: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedAt: {
        type: Date,
      },
      notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Approval notes cannot exceed 1000 characters'],
      },
    },
  },
  { timestamps: true }
);

temporaryRemedySchema.index({ approvalStatus: 1, createdAt: -1 });
temporaryRemedySchema.index({ symptoms: 1, approvalStatus: 1 });
temporaryRemedySchema.index({ probableConditionCategory: 1, approvalStatus: 1 });

module.exports = mongoose.model('TemporaryRemedy', temporaryRemedySchema);
