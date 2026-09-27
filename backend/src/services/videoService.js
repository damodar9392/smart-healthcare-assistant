const videoConfig = require('../config/videoConfig');

const dateString = (date) => date.toISOString().slice(0, 10);

const appointmentStartUtc = (appointment) =>
  new Date(`${dateString(appointment.date)}T${appointment.startTime}:00`);

const createVideoRoom = (appointment) => {
  const id = `${appointment._id}`;
  const roomId = `sha-${id}`;
  const url = `https://${videoConfig.jitsi.domain}/${videoConfig.jitsi.roomPrefix}-${roomId}`;
  const opensAt = appointmentStartUtc(appointment);
  const expiresAt = new Date(opensAt.getTime() + videoConfig.jitsi.roomHoursAfter * 3600 * 1000);
  return {
    videoRoomId: roomId,
    videoRoomUrl: url,
    videoCreatedAt: new Date(),
    videoExpiresAt: expiresAt,
  };
};

const canJoin = (appointment, now = new Date()) => {
  if (!appointment.videoRoomUrl || !appointment.videoExpiresAt) {
    return false;
  }
  if (['cancelled', 'completed'].includes(appointment.status)) {
    return false;
  }
  const start = appointmentStartUtc(appointment);
  const openAt = new Date(start.getTime() - videoConfig.jitsi.openMinutesBefore * 60 * 1000);
  return now >= openAt && now <= appointment.videoExpiresAt;
};

const openIn = (appointment, now = new Date()) => {
  const start = appointmentStartUtc(appointment);
  return Math.max(0, start.getTime() - videoConfig.jitsi.openMinutesBefore * 60 * 1000 - now.getTime());
};

module.exports = { createVideoRoom, canJoin, openIn, appointmentStartUtc };