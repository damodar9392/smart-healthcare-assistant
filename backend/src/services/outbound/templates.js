const dateString = (date) => (date instanceof Date ? date.toISOString().slice(0, 10) : String(date));

const buildEmail = (subject, text) => ({
  subject,
  text,
  html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
  <h2 style="color:#0d9488">Smart Healthcare Assistant</h2>
  <p>${text.replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p>
  <hr style="border:none;border-top:1px solid #e2e8f0"/>
  <p style="font-size:12px;color:#64748b">This is an automated message. Please do not reply.</p>
</div>`,
});

const appointmentSummary = (appointment) => {
  const doctor = appointment.doctor?.name || 'your doctor';
  const patient = appointment.patient?.name || 'a patient';
  return {
    date: dateString(appointment.date),
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    doctor,
    patient,
    reason: appointment.reason || '',
  };
};

const TEMPLATES = {
  appointment_confirmed: {
    subject: (a) => `Appointment confirmed: ${a.doctor} on ${a.date} at ${a.startTime}`,
    text: (a) => [
      `Dear ${a.recipient},`,
      ``,
      `Your appointment with ${a.doctor} is confirmed.`,
      ``,
      `Date: ${a.date}`,
      `Time: ${a.startTime} - ${a.endTime}`,
      `Reason: ${a.reason || '—'}`,
      ``,
      `Please arrive a few minutes early. To cancel or reschedule, log in to your dashboard.`,
    ].join('\n'),
  },
  appointment_cancelled: {
    subject: (a) => `Appointment cancelled: ${a.doctor} on ${a.date} at ${a.startTime}`,
    text: (a) => [
      `Dear ${a.recipient},`,
      ``,
      `The appointment with ${a.doctor} on ${a.date} at ${a.startTime} has been cancelled.`,
      ``,
      `If you did not request this, please contact the clinic. You can book a new appointment from your dashboard.`,
    ].join('\n'),
  },
  appointment_rescheduled: {
    subject: (a) => `Appointment rescheduled: ${a.doctor} on ${a.date} at ${a.startTime}`,
    text: (a) => [
      `Dear ${a.recipient},`,
      ``,
      `The appointment with ${a.doctor} has been rescheduled.`,
      ``,
      `New time: ${a.date} at ${a.startTime} - ${a.endTime}`,
      ``,
      `Please update your calendar. To change it again, log in to your dashboard.`,
    ].join('\n'),
  },
  appointment_reminder: {
    subject: (a) => `Reminder: appointment with ${a.doctor} on ${a.date} at ${a.startTime}`,
    text: (a) => [
      `Dear ${a.recipient},`,
      ``,
      `This is a reminder that you have an appointment tomorrow with ${a.doctor}.`,
      ``,
      `Date: ${a.date}`,
      `Time: ${a.startTime} - ${a.endTime}`,
      `Reason: ${a.reason || '—'}`,
      ``,
      `Please arrive a few minutes early.`,
    ].join('\n'),
  },
};

const renderTemplate = (type, summary) => {
  const template = TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown email template: ${type}`);
  }
  return buildEmail(template.subject(summary), template.text(summary));
};

module.exports = { renderTemplate, appointmentSummary, TEMPLATES };