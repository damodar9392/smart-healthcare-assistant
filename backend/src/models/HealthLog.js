const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['blood_pressure', 'heart_rate', 'temperature', 'weight', 'blood_sugar'],
        message: '{VALUE} is not a valid vital type',
      },
      required: [true, 'Vital type is required'],
    },
    value: {
      type: Number,
    },
    systolic: {
      type: Number,
    },
    diastolic: {
      type: Number,
    },
    unit: {
      type: String,
      trim: true,
      maxlength: [20, 'Unit cannot exceed 20 characters'],
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

healthLogSchema.index({ user: 1, recordedAt: -1 });

healthLogSchema.methods.toPublicJSON = function () {
  const value =
    this.type === 'blood_pressure'
      ? `${this.systolic}/${this.diastolic}`
      : this.value;
  return {
    _id: this._id,
    type: this.type,
    value,
    unit: this.unit,
    systolic: this.systolic,
    diastolic: this.diastolic,
    notes: this.notes,
    recordedAt: this.recordedAt,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('HealthLog', healthLogSchema);