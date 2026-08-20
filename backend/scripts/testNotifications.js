require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const OutboundNotification = require('../src/models/OutboundNotification');
const {
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
  notifyAppointmentReminder,
} = require('../src/services/appointmentNotificationService');

const fakeAppointment = (patient, doctor, overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  patient,
  doctor,
  date: new Date(Date.now() + 26 * 3600000),
  startTime: '10:00',
  endTime: '10:30',
  reason: 'Test appointment for notification preview',
  status: 'scheduled',
  ...overrides,
});

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in .env — cannot run the test harness.');
    process.exit(1);
  }

  await connectDB();
  console.log('Connected to MongoDB.');
  console.log(
    `Transport mode: ${process.env.EMAIL_TRANSPORT || 'console'} — emails will print to the console and are NOT sent externally.\n`
  );

  const patient = await User.findOne({ role: 'patient' }).select('name email');
  const doctor = await User.findOne({ role: 'doctor' }).select('name email');
  if (!patient || !doctor) {
    console.error('Need at least one patient and one doctor user in the database.');
    process.exit(1);
  }

  console.log(`Patient: ${patient.email}`);
  console.log(`Doctor: ${doctor.email}\n`);

  const confirmed = await notifyAppointmentConfirmed(fakeAppointment(patient, doctor));
  const cancelled = await notifyAppointmentCancelled(
    fakeAppointment(patient, doctor),
    patient._id
  );
  const rescheduled = await notifyAppointmentRescheduled(
    fakeAppointment(patient, doctor, { startTime: '14:30', endTime: '15:00' })
  );
  const reminder = await notifyAppointmentReminder(fakeAppointment(patient, doctor));

  const records = await OutboundNotification.find({ user: { $in: [patient._id, doctor._id] } })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('type channel to status subject sentAt error');

  console.log('\n--- Stored delivery records ---');
  records.forEach((record) => {
    console.log(
      `${record.type.padEnd(28)} ${record.channel.padEnd(6)} ${record.status.padEnd(8)} to=${record.to} "${record.subject}"${record.error ? ` error=${record.error}` : ''}`
    );
  });

  console.log('\nDone. Delivery statuses above confirm the module works end-to-end in dev.');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});