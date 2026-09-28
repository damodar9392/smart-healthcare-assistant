const mongoose = require('mongoose');

const outboundNotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user reference is required'],
    },
    type: {
      type: String,
      enum: {
        values: [
          'appointment_confirmed',
          'appointment_cancelled',
          'appointment_rescheduled',
          'appointment_reminder',
          'enquiry_received',
        ],
        message: '{VALUE} is not a valid outbound notification type',
      },
      required: [true, 'Notification type is required'],
    },
    channel: {
      type: String,
      enum: {
        values: ['email', 'sms', 'push'],
        message: '{VALUE} is not a valid channel',
      },
      default: 'email',
    },
    to: {
      type: String,
      required: [true, 'Recipient address is required'],
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    body: {
      type: String,
      trim: true,
      maxlength: [10000, 'Body cannot exceed 10000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['queued', 'sent', 'failed', 'delivered'],
        message: '{VALUE} is not a valid delivery status',
      },
      default: 'queued',
    },
    attempts: {
      type: Number,
      default: 0,
      min: [0, 'Attempts cannot be negative'],
    },
    sentAt: {
      type: Date,
    },
    error: {
      type: String,
      trim: true,
      maxlength: [500, 'Error message cannot exceed 500 characters'],
    },
    metadata: {
      appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
      },
      enquiryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enquiry',
      },
    },
  },
  { timestamps: true }
);

outboundNotificationSchema.index({ user: 1, createdAt: -1 });
outboundNotificationSchema.index({ status: 1, createdAt: 1 });
outboundNotificationSchema.index({ type: 1, 'metadata.appointmentId': 1 });

module.exports = mongoose.model('OutboundNotification', outboundNotificationSchema);