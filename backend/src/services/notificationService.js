const Notification = require('../models/Notification');
const User = require('../models/User');

const notifyUser = (userId, type, title, message, relatedId) =>
  Notification.create({ user: userId, type, title, message, relatedId });

const notifyAdmins = async (type, title, message, relatedId) => {
  const admins = await User.find({ role: 'admin' }).select('_id');
  const payload = admins.map((admin) => ({
    user: admin._id,
    type,
    title,
    message,
    relatedId,
  }));
  if (payload.length > 0) {
    await Notification.insertMany(payload);
  }
};

module.exports = { notifyUser, notifyAdmins };
