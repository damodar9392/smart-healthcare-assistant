const Appointment = require('../models/Appointment');
const OutboundNotification = require('../models/OutboundNotification');
const config = require('../config/notificationConfig');
const { notifyAppointmentReminder } = require('../services/appointmentNotificationService');

const REMINDER_TYPE = 'appointment_reminder';

const reminderAlreadySent = (appointmentId) =>
  OutboundNotification.exists({
    type: REMINDER_TYPE,
    'metadata.appointmentId': appointmentId,
    status: { $ne: 'failed' },
  });

const collectDueAppointments = async (leadHours) => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + leadHours * 3600000);

  const appointments = await Appointment.find({
    status: { $in: ['scheduled', 'rescheduled'] },
    date: { $gte: now, $lte: windowEnd },
  })
    .populate('patient', 'name email')
    .populate('doctor', 'name')
    .lean();

  const due = [];
  for (const appointment of appointments) {
    const start = new Date(
      `${appointment.date.toISOString().slice(0, 10)}T${appointment.startTime}:00`
    );
    if (start <= windowEnd && !(await reminderAlreadySent(appointment._id))) {
      due.push(appointment);
    }
  }
  return due;
};

const runReminderCheck = async () => {
  const { leadHours } = config.reminder;
  try {
    const due = await collectDueAppointments(leadHours);
    for (const appointment of due) {
      await notifyAppointmentReminder(appointment);
    }
    if (due.length > 0) {
      console.log(`[reminder-scheduler] sent ${due.length} appointment reminder(s)`);
    }
  } catch (err) {
    console.error(`[reminder-scheduler] error: ${err.message}`);
  }
};

const startReminderScheduler = () => {
  if (!config.reminder.enabled) {
    console.log('[reminder-scheduler] disabled via config');
    return null;
  }
  const intervalMs = config.reminder.checkIntervalMinutes * 60000;
  runReminderCheck();
  const timer = setInterval(runReminderCheck, intervalMs);
  console.log(
    `[reminder-scheduler] started — checking every ${config.reminder.checkIntervalMinutes} minute(s), lead ${config.reminder.leadHours}h`
  );
  return timer;
};

const stopReminderScheduler = (timer) => {
  if (timer) {
    clearInterval(timer);
    console.log('[reminder-scheduler] stopped');
  }
};

module.exports = { startReminderScheduler, stopReminderScheduler, runReminderCheck };