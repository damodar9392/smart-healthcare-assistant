const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const TemporaryRemedy = require('../models/TemporaryRemedy');
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

  const appointmentCounts = appointmentStatuses.reduce(
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

module.exports = { getStats };