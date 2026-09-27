module.exports = {
  jitsi: {
    enabled: process.env.VIDEO_ENABLED !== 'false',
    domain: process.env.VIDEO_DOMAIN || 'meet.jit.si',
    roomPrefix: process.env.VIDEO_ROOM_PREFIX || 'SmartCare',
    openMinutesBefore: parseInt(process.env.VIDEO_OPEN_MINUTES_BEFORE, 10) || 15,
    roomHoursAfter: parseInt(process.env.VIDEO_ROOM_HOURS_AFTER, 10) || 2,
  },
};