const Appointment = require('../models/Appointment');
const DoctorAvailability = require('../models/DoctorAvailability');
const { slotMinutes } = require('../config/bookingRules');
const ApiError = require('../utils/ApiError');

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const fromMinutes = (total) => {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const addMinutes = (time, minutes) => fromMinutes(toMinutes(time) + minutes);

const BLOCKING_STATUSES = ['scheduled', 'rescheduled', 'completed'];

const getWindows = async (doctorUserId, date) => {
  const dayOfWeek = new Date(date).getUTCDay();
  return DoctorAvailability.find({ doctor: doctorUserId, dayOfWeek, isAvailable: true })
    .sort({ startTime: 1 })
    .lean();
};

const generateSlots = async (doctorUserId, date) => {
  const windows = await getWindows(doctorUserId, date);

  const allSlots = [];
  windows.forEach((window) => {
    let start = window.startTime;
    while (toMinutes(start) + slotMinutes <= toMinutes(window.endTime)) {
      allSlots.push({ startTime: start, endTime: addMinutes(start, slotMinutes) });
      start = addMinutes(start, slotMinutes);
    }
  });

  const blocked = await Appointment.find({
    doctor: doctorUserId,
    date,
    status: { $in: BLOCKING_STATUSES },
  }).select('startTime');

  const blockedTimes = new Set(blocked.map((a) => a.startTime));
  return allSlots.filter((slot) => !blockedTimes.has(slot.startTime));
};

const assertSlotAvailable = async (doctorUserId, date, startTime, endTime) => {
  const window = await DoctorAvailability.findOne({
    doctor: doctorUserId,
    dayOfWeek: new Date(date).getUTCDay(),
    isAvailable: true,
    startTime: { $lte: startTime },
    endTime: { $gte: endTime },
  });
  if (!window) {
    throw new ApiError(400, 'Doctor is not available at the requested time');
  }

  const conflict = await Appointment.exists({
    doctor: doctorUserId,
    date,
    status: { $in: BLOCKING_STATUSES },
    startTime,
  });
  if (conflict) {
    throw new ApiError(409, 'This slot is already booked');
  }
};

module.exports = { generateSlots, assertSlotAvailable, addMinutes, toMinutes };