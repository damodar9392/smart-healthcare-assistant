const { notifyUser } = require('./notificationService');
const { sendTemplatedEmail } = require('./outbound');
const { appointmentSummary } = require('./outbound/templates');
const User = require('../models/User');

const emailOf = async (userId, type, summary, appointmentId) => {
  try {
    const user = await User.findById(userId).select('name');
    await sendTemplatedEmail({
      userId,
      type,
      summary: { ...summary, recipient: user?.name || 'there' },
      metadata: { appointmentId },
    });
  } catch (err) {
    console.error(`Outbound ${type} email to ${userId} failed: ${err.message}`);
  }
};

const inApp = (userId, title, message, appointmentId) =>
  notifyUser(userId, 'appointment', title, message, appointmentId);

const summaryFor = (appointment) => appointmentSummary(appointment);

const notifyAppointmentConfirmed = (appointment) =>
  Promise.all([
    inApp(
      appointment.patient,
      'New appointment booked',
      `Your appointment on ${appointment.date.toISOString().slice(0, 10)} at ${appointment.startTime} is confirmed`,
      appointment._id
    ),
    inApp(
      appointment.doctor,
      'New appointment booked',
      `${appointment.patient?.name || 'A patient'} booked an appointment on ${appointment.date.toISOString().slice(0, 10)} at ${appointment.startTime}`,
      appointment._id
    ),
    emailOf(appointment.patient, 'appointment_confirmed', summaryFor(appointment), appointment._id),
    emailOf(appointment.doctor, 'appointment_confirmed', summaryFor(appointment), appointment._id),
  ]);

const notifyAppointmentCancelled = (appointment, cancelledByUserId) => {
  const cancelledByPatient =
    String(appointment.patient._id || appointment.patient) === String(cancelledByUserId);
  const message = `Your appointment on ${appointment.date.toISOString().slice(0, 10)} at ${appointment.startTime} was cancelled`;

  return Promise.all([
    inApp(appointment.patient, 'Appointment cancelled', message, appointment._id),
    inApp(appointment.doctor, 'Appointment cancelled', message, appointment._id),
    emailOf(
      cancelledByPatient ? appointment.doctor : appointment.patient,
      'appointment_cancelled',
      summaryFor(appointment),
      appointment._id
    ),
  ]);
};

const notifyAppointmentRescheduled = (appointment) =>
  Promise.all([
    inApp(
      appointment.patient,
      'Appointment rescheduled',
      `Your appointment moved to ${appointment.date.toISOString().slice(0, 10)} at ${appointment.startTime}`,
      appointment._id
    ),
    inApp(
      appointment.doctor,
      'Appointment rescheduled',
      `An appointment moved to ${appointment.date.toISOString().slice(0, 10)} at ${appointment.startTime}`,
      appointment._id
    ),
    emailOf(appointment.patient, 'appointment_rescheduled', summaryFor(appointment), appointment._id),
    emailOf(appointment.doctor, 'appointment_rescheduled', summaryFor(appointment), appointment._id),
  ]);

const notifyAppointmentReminder = (appointment) =>
  emailOf(appointment.patient, 'appointment_reminder', summaryFor(appointment), appointment._id);

module.exports = {
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
  notifyAppointmentReminder,
};