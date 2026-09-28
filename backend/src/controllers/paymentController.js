const { body, param } = require('express-validator');
const Payment = require('../models/Payment');
const { pay } = require('../services/paymentService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');

const payValidation = [
  param('id').isMongoId().withMessage('Invalid payment id'),
  body('method')
    .optional()
    .isIn(['mock', 'card', 'upi', 'cash', 'netbanking'])
    .withMessage('Invalid payment method'),
  validate,
];

const idValidation = [param('id').isMongoId().withMessage('Invalid payment id'), validate];

const getMyInvoices = asyncHandler(async (req, res) => {
  const invoices = await Payment.find({ patient: req.user._id })
    .populate('doctor', 'name')
    .populate('appointment', 'date startTime endTime status')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: invoices });
});

const getById = asyncHandler(async (req, res) => {
  const invoice = await Payment.findById(req.params.id)
    .populate('doctor', 'name')
    .populate('patient', 'name email phone')
    .populate('appointment', 'date startTime endTime status');
  if (!invoice) {
    throw new ApiError(404, 'Payment not found');
  }
  const isOwner = invoice.patient && String(invoice.patient._id || invoice.patient) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed to view this payment');
  }
  res.json({ success: true, data: invoice });
});

const payInvoice = asyncHandler(async (req, res) => {
  const invoice = await Payment.findById(req.params.id)
    .populate('doctor', 'name')
    .populate('appointment', 'date startTime endTime');
  if (!invoice) {
    throw new ApiError(404, 'Payment not found');
  }
  const isOwner = invoice.patient && String(invoice.patient._id || invoice.patient) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only the patient can pay this invoice');
  }
  const updated = await pay(invoice, req.body.method || 'mock');
  await updated.populate('doctor', 'name').populate('appointment', 'date startTime endTime');
  res.json({ success: true, data: updated });
});

module.exports = { getMyInvoices, getById, payInvoice, payValidation, idValidation };