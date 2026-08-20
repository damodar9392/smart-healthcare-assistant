require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const adminRemedyRoutes = require('./routes/adminRemedyRoutes');
const adminDoctorRoutes = require('./routes/adminDoctorRoutes');
const adminReviewRoutes = require('./routes/adminReviewRoutes');
const adminAppointmentRoutes = require('./routes/adminAppointmentRoutes');
const adminStatsRoutes = require('./routes/adminStatsRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminSponsoredServiceRoutes = require('./routes/adminSponsoredServiceRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const remedyRoutes = require('./routes/remedyRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const sponsoredServiceRoutes = require('./routes/sponsoredServiceRoutes');
const userRoutes = require('./routes/userRoutes');
const urgencyRoutes = require('./routes/urgencyRoutes');
const { startReminderScheduler, stopReminderScheduler } = require('./jobs/reminderScheduler');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
let corsOrigins;
if (process.env.CORS_ORIGIN) {
  corsOrigins = process.env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (corsOrigins.length === 1 && corsOrigins[0] === '*') corsOrigins = '*';
} else {
  corsOrigins = '*';
}
app.use(cors({ origin: corsOrigins }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/remedies', remedyRoutes);
app.use('/api/admin/remedies', adminRemedyRoutes);
app.use('/api/admin/doctors', adminDoctorRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use('/api/admin/appointments', adminAppointmentRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/sponsored-services', adminSponsoredServiceRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sponsored-services', sponsoredServiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/urgency', urgencyRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
    const reminderTimer = startReminderScheduler();
    server.on('close', () => stopReminderScheduler(reminderTimer));
  } catch (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

start();
