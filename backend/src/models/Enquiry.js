const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Enquiry owner is required'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: {
        values: ['appointment', 'medical', 'technical', 'feedback', 'other'],
        message: '{VALUE} is not a valid enquiry category',
      },
      default: 'other',
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'in-progress', 'resolved', 'closed'],
        message: '{VALUE} is not a valid enquiry status',
      },
      default: 'open',
    },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

enquirySchema.index({ user: 1, status: 1 });
enquirySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Enquiry', enquirySchema);