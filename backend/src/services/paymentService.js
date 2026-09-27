const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const paymentConfig = require('../config/paymentConfig');
const { notifyUser } = require('./notificationService');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const existingForAppointment = (appointmentId) =>
  Payment.findOne({
    appointment: appointmentId,
    status: { $in: ['pending', 'paid'] },
  });

const setAppointmentPaymentStatus = (appointmentId, status) =>
  Appointment.updateOne({ _id: appointmentId }, { $set: { paymentStatus: status } });

const initiateForAppointment = async (appointment) => {
  const existing = await existingForAppointment(appointment._id);
  if (existing) {
    await setAppointmentPaymentStatus(appointment._id, existing.status);
    return existing;
  }

  const payment = await Payment.create({
    patient: appointment.patient,
    doctor: appointment.doctor,
    appointment: appointment._id,
    amount: appointment.consultationFee || 0,
    currency: paymentConfig.currency,
    status: 'pending',
    method: 'mock',
    description: 'Consultation fee',
  });

  if (paymentConfig.isMock) {
    return markPaid(payment);
  }

  await setAppointmentPaymentStatus(appointment._id, 'pending');
  return payment;
};

const markPaid = async (payment, method = 'mock') => {
  if (payment.status === 'paid') {
    return payment;
  }
  await sleep(paymentConfig.mockDelayMs);
  payment.status = 'paid';
  payment.method = method;
  payment.transactionId = payment.transactionId || `MOCK-${Date.now()}-${Math.floor(Math.random() * 999)}`;
  payment.paidAt = new Date();
  await payment.save();
  await setAppointmentPaymentStatus(payment.appointment, 'paid');
  await notifyUser(
    payment.patient,
    'appointment',
    'Payment confirmed',
    `Payment of ${payment.currency} ${payment.amount} for your appointment was successful (${payment.transactionId}).`
  );
  return payment;
};

const pay = async (payment, method = 'mock') => {
  if (payment.status !== 'pending') {
    const error = new Error('Payment is not pending and cannot be paid');
    error.statusCode = 400;
    throw error;
  }
  if (!['mock', 'card', 'upi', 'cash', 'netbanking'].includes(method)) {
    const error = new Error('Invalid payment method');
    error.statusCode = 400;
    throw error;
  }
  return markPaid(payment, method);
};

const refundForAppointment = async (appointment) => {
  const payment = await Payment.findOne({
    appointment: appointment._id,
    status: 'paid',
  });
  if (!payment) {
    await setAppointmentPaymentStatus(appointment._id, 'unpaid');
    return null;
  }
  payment.status = 'refunded';
  payment.refundedAt = new Date();
  await payment.save();
  await setAppointmentPaymentStatus(appointment._id, 'refunded');
  await notifyUser(
    payment.patient,
    'appointment',
    'Payment refunded',
    `Your payment of ${payment.currency} ${payment.amount} was refunded because the appointment was cancelled.`
  );
  return payment;
};

module.exports = { initiateForAppointment, pay, markPaid, refundForAppointment, existingForAppointment };