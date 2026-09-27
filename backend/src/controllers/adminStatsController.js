const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const TemporaryRemedy = require('../models/TemporaryRemedy');
const Payment = require('../models/Payment');
const Prescription = require('../models/Prescription');
const Conversation = require('../models/Conversation');
const SymptomSearch = require('../models/SymptomSearch');
const asyncHandler = require('../utils/asyncHandler');

const getStats = asyncHandler(async (req, res) => {
  const [usersByRole, doctorByStatus, appointmentsByStatus, totals] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    DoctorProfile.aggregate([{ $group: { _id: '$verificationStatus', count: { $sum: 1 } } }]),
    Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Promise.all([
      User.countDocuments(),
      DoctorProfile.countDocuments(),
      Appointment.countDocuments(),
      TemporaryRemedy.countDocuments({ approvalStatus: 'pending' }),
    ]),
  ]);

  const roleCounts = usersByRole.reduce(
    (acc, entry) => {
      acc[entry._id] = entry.count;
      return acc;
    },
    { patient: 0, doctor: 0, admin: 0 }
  );

  const verifCounts = doctorByStatus.reduce(
    (acc, entry) => {
      acc[entry._id] = entry.count;
      return acc;
    },
    { pending: 0, verified: 0, rejected: 0 }
  );

  const appointmentCounts = appointmentsByStatus.reduce(
    (acc, entry) => {
      acc[entry._id] = entry.count;
      return acc;
    },
    { scheduled: 0, rescheduled: 0, completed: 0, cancelled: 0 }
  );

  const [totalUsers, totalDoctors, totalAppointments, pendingGuidance] = totals;

  res.json({
    success: true,
    data: {
      totalUsers,
      totalDoctors,
      verifiedDoctors: verifCounts.verified,
      pendingVerifications: verifCounts.pending,
      pendingGuidance,
      totalAppointments,
      usersByRole: roleCounts,
      doctorsByStatus: verifCounts,
      appointmentsByStatus: appointmentCounts,
    },
  });
});

const getAnalytics = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 90);
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const dateFormat = { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' };

  const [
    appointmentsByDay,
    statusDistribution,
    sellers,
    urgencyDistribution,
    revenueByStatus,
    doctorLoad,
    conversations,
    prescriptions,
    usersTrend,
  ] = await Promise.all([
    Appointment.aggregate([
      { $match: { date: { $gte: start } } },
      { $group: { _id: { $dateToString: dateFormat }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    SymptomSearch.aggregate([
      { $unwind: '$symptoms' },
      { $group: { _id: { $toLower: { $trim: { input: '$symptoms' } } }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    SymptomSearch.aggregate([
      { $group: { _id: '$result.urgencyLevel', count: { $sum: 1 } } },
    ]),
    Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
    Appointment.aggregate([
      { $group: { _id: '$doctor', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Conversation.countDocuments({ isDeleted: false }),
    Prescription.countDocuments({ status: 'active' }),
    User.aggregate([
      { $match: { createdAt: { $gte: start }, role: { $ne: 'admin' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const doctorIds = doctorLoad.map((d) => d._id);
  const doctorNames = await User.find({ _id: { $in: doctorIds } }).select('name').lean();
  const nameMap = new Map(doctorNames.map((d) => [String(d._id), d.name]));

  res.json({
    success: true,
    data: {
      range: { days, start },
      appointmentsByDay,
      statusDistribution: statusDistribution.reduce((acc, e) => {
        acc[e._id] = e.count;
        return acc;
      }, { scheduled: 0, rescheduled: 0, completed: 0, cancelled: 0 }),
      topSymptoms: sellers.map((s) => ({ symptom: s._id, count: s.count })),
      urgencyDistribution: urgencyDistribution.reduce((acc, e) => {
        acc[e._id] = e.count;
        return acc;
      }, { low: 0, medium: 0, high: 0, emergency: 0 }),
      revenue: {
        byStatus: revenueByStatus.reduce((acc, e) => {
          acc[e._id] = { count: e.count, total: e.total };
          return acc;
        }, { pending: { count: 0, total: 0 }, paid: { count: 0, total: 0 }, refunded: { count: 0, total: 0 }, failed: { count: 0, total: 0 } }),
      },
      doctorLoad: doctorLoad.map((d) => ({
        doctor: nameMap.get(String(d._id)) || 'Unknown',
        count: d.count,
      })),
      conversations,
      prescriptions,
      usersTrend,
    },
  });
});

module.exports = { getStats, getAnalytics };