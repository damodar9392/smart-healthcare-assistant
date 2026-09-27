const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser, emitToAdmins } = require('./liveHub');
const { sendToUser } = require('./pushService');

const broadcast = (notification) => {
  const plain = notification.toObject();
  emitToUser(notification.user, 'notification:new', {
    type: 'notification:new',
    data: plain,
  });
  sendToUser(notification.user, {
    id: plain._id,
    title: plain.title,
    message: plain.message,
    type: plain.type,
  }).catch(() => {});
};

const notifyUser = async (userId, type, title, message, relatedId) => {
  const notification = await Notification.create({ user: userId, type, title, message, relatedId });
  broadcast(notification);
  return notification;
};

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
    const inserted = await Notification.insertMany(payload);
    inserted.forEach((notification) => {
      const plain = notification.toObject();
      emitToUser(notification.user, 'notification:new', {
        type: 'notification:new',
        data: plain,
      });
      sendToUser(notification.user, {
        id: plain._id,
        title: plain.title,
        message: plain.message,
        type: plain.type,
      }).catch(() => {});
    });
    emitToAdmins('notification:new', {
      type: 'notification:new',
      data: { title, message, type },
    });
  }
};

module.exports = { notifyUser, notifyAdmins };