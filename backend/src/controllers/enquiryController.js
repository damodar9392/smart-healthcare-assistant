const { body } = require('express-validator');
const Enquiry = require('../models/Enquiry');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { notifyUser, notifyAdmins } = require('../services/notificationService');
const { sendTemplatedEmail } = require('../services/outbound');

const CATEGORIES = ['appointment', 'medical', 'technical', 'feedback', 'other'];
const STATUSES = ['open', 'in-progress', 'resolved', 'closed'];

const createValidation = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),
  body('category')
    .optional()
    .isIn(CATEGORIES)
    .withMessage('Invalid enquiry category'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 2000 })
    .withMessage('Message cannot exceed 2000 characters'),
  validate,
];

const create = asyncHandler(async (req, res) => {
  const { subject, category, message } = req.body;
  const enquiry = await Enquiry.create({
    user: req.user._id,
    subject,
    category,
    message,
  });
  await notifyUser(
    req.user._id,
    'enquiry',
    'Enquiry received',
    `We received "${subject}". Our team will respond soon.`,
    enquiry._id
  );
  await notifyAdmins(
    'enquiry',
    'New patient enquiry',
    `${req.user.name}: ${subject}`,
    enquiry._id
  );
  try {
    await sendTemplatedEmail({
      userId: req.user._id,
      type: 'enquiry_received',
      summary: {
        recipient: req.user.name,
        reference: String(enquiry._id),
        category: enquiry.category,
        subject: enquiry.subject,
      },
      metadata: { enquiryId: String(enquiry._id) },
    });
  } catch (err) {
    console.error(`Enquiry confirmation email failed: ${err.message}`);
  }
  res.status(201).json({ success: true, data: enquiry });
});

const getMine = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.status && STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }
  const data = await Enquiry.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data });
});

module.exports = { createValidation, create, getMine };