require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { validateEnv } = require('./config/env');
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
const assistantRoutes = require('./routes/assistantRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const patientProfileRoutes = require('./routes/patientProfileRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const { attach: attachLiveHub } = require('./services/liveHub');
const { startReminderScheduler, stopReminderScheduler } = require('./jobs/reminderScheduler');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { generalRateLimit } = require('./middleware/rateLimit');

const app = express();

validateEnv();

// Behind nginx/Caddy the socket peer is the proxy, not the client. Without this,
// req.ip is the proxy's IP and every rate limit collapses into a single shared
// bucket. Trust exactly one hop (the bundled reverse proxy), not the whole chain.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
let corsOrigins;
if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.trim() !== '*') {
  corsOrigins = process.env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
if (!corsOrigins || corsOrigins.length === 0) {
  corsOrigins = '*';
}
app.use(
  cors({
    origin: corsOrigins,
    credentials: corsOrigins !== '*',
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(morgan('dev'));
app.use(generalRateLimit);

const healthHandler = async (req, res) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  let aiService = 'unavailable';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(`${aiServiceUrl}/health`, { signal: controller.signal });
    clearTimeout(timer);
    aiService = response.ok ? 'ok' : 'unavailable';
  } catch {
    aiService = 'unavailable';
  }
  res.json({ status: 'ok', aiService });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

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
app.use('/api/assistant', assistantRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/patients', patientProfileRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/interactions', interactionRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    const server = http.createServer(app);
    attachLiveHub(server);
    server.listen(PORT, () => {
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
