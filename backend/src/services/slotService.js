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

const expandWindows = (windows) => {
  const allSlots = [];
  windows.forEach((window) => {
    let start = window.startTime;
    while (toMinutes(start) + slotMinutes <= toMinutes(window.endTime)) {
      allSlots.push({ startTime: start, endTime: addMinutes(start, slotMinutes) });
      start = addMinutes(start, slotMinutes);
    }
  });
  return allSlots;
};

const generateSlots = async (doctorUserId, date) => {
  const windows = await getWindows(doctorUserId, date);
  const allSlots = expandWindows(windows);

  const blocked = await Appointment.find({
    doctor: doctorUserId,
    date,
    status: { $in: BLOCKING_STATUSES },
  }).select('startTime');

  const blockedTimes = new Set(blocked.map((a) => a.startTime));
  return allSlots.filter((slot) => !blockedTimes.has(slot.startTime));
};

const toDateKey = (date) => date.toISOString().slice(0, 10);

const startOfUtcDay = (value) => {
  const date = new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
};

const addDays = (date, days) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const bookingKey = (dateKey, startTime) => `${dateKey}|${startTime}`;

const buildAvailabilityIndex = (windows, appointments) => {
  const byDoctor = new Map();

  windows.forEach((window) => {
    const key = String(window.doctor);
    if (!byDoctor.has(key)) {
      byDoctor.set(key, { windows: [], booked: new Set(), hasWindows: false });
    }
    const entry = byDoctor.get(key);
    entry.windows.push({
      dayOfWeek: window.dayOfWeek,
      startTime: window.startTime,
      endTime: window.endTime,
    });
    entry.hasWindows = true;
  });

  appointments.forEach((appointment) => {
    const key = String(appointment.doctor);
    if (!byDoctor.has(key)) {
      byDoctor.set(key, { windows: [], booked: new Set(), hasWindows: false });
    }
    byDoctor.get(key).booked.add(
      bookingKey(toDateKey(new Date(appointment.date)), appointment.startTime)
    );
  });

  return byDoctor;
};

const findNextFreeSlot = ({ windows, booked, fromDate, horizonDays }) => {
  if (!windows || windows.length === 0) {
    return null;
  }

  const start = startOfUtcDay(fromDate);
  for (let offset = 0; offset < horizonDays; offset += 1) {
    const day = addDays(start, offset);
    const dateKey = toDateKey(day);
    const dayOfWeek = day.getUTCDay();
    const dayWindows = windows.filter((window) => window.dayOfWeek === dayOfWeek);
    if (dayWindows.length === 0) {
      continue;
    }
    const free = expandWindows(dayWindows).find(
      (slot) => !booked.has(bookingKey(dateKey, slot.startTime))
    );
    if (free) {
      return { date: dateKey, startTime: free.startTime, daysAhead: offset };
    }
  }

  return null;
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

module.exports = {
  generateSlots,
  assertSlotAvailable,
  buildAvailabilityIndex,
  findNextFreeSlot,
  addMinutes,
  toMinutes,
  BLOCKING_STATUSES,
};