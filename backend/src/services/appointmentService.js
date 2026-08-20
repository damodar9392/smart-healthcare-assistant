const Appointment = require('../models/Appointment');
const DoctorAvailability = require('../models/DoctorAvailability');
const ApiError = require('../utils/ApiError');

const findOverlappingAppointment = (doctorId, date, startTime, endTime) =>
  Appointment.findOne({
    doctor: doctorId,
    date,
    status: { $in: ['pending', 'confirmed'] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });

const validateSlot = async (doctorId, date, startTime, endTime) => {
  const dayOfWeek = new Date(date).getUTCDay();

  const slot = await DoctorAvailability.findOne({
    doctor: doctorId,
    dayOfWeek,
    isAvailable: true,
    startTime: { $lte: startTime },
    endTime: { $gte: endTime },
  });

  if (!slot) {
    throw new ApiError(400, 'Doctor is not available at the requested time');
  }

  const conflict = await findOverlappingAppointment(doctorId, date, startTime, endTime);
  if (conflict) {
    throw new ApiError(409, 'The doctor already has an appointment in that time range');
  }
};

module.exports = { validateSlot, findOverlappingAppointment };
