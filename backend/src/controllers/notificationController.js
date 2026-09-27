const Notification = require('../models/Notification');
const User = require('../models/User');
const config = require('../config/notificationConfig');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const subscribeValidation = [
  body('subscription.endpoint')
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage('A valid push subscription endpoint is required'),
  body('subscription.keys.p256dh').optional().isString().isLength({ max: 500 }),
  body('subscription.keys.auth').optional().isString().isLength({ max: 500 }),
  validate,
];

const getMine = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.unread === 'true') {
    filter.read = false;
  }
  const data = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  res.json({ success: true, data: notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, read: false },
    { read: true }
  );
  res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
});

const remove = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  res.json({ success: true, message: 'Notification deleted' });
});

const getVapidKey = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: config.push.enabled,
      publicKey: config.push.enabled ? config.push.vapid.publicKey : null,
    },
  });
});

const subscribe = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  const user = await User.findById(req.user._id).select('pushSubscriptions');

  const entry = {
    endpoint: subscription.endpoint,
    keys: subscription.keys || {},
    userAgent: (req.headers['user-agent'] || '').slice(0, 200) || null,
  };

  const existing = (user.pushSubscriptions || []).find(
    (sub) => sub.endpoint === subscription.endpoint
  );
  if (existing) {
    existing.keys = entry.keys;
    existing.userAgent = entry.userAgent;
  } else {
    user.pushSubscriptions.push(entry);
    if (user.pushSubscriptions.length > 10) {
      user.pushSubscriptions = user.pushSubscriptions.slice(-10);
    }
  }
  await user.save();

  res.json({ success: true, data: { subscribed: true, count: user.pushSubscriptions.length } });
});

const unsubscribe = asyncHandler(async (req, res) => {
  const endpoint = (req.body.endpoint || '').toString();
  if (!endpoint) {
    throw new ApiError(400, 'Endpoint is required');
  }
  const user = await User.findById(req.user._id).select('pushSubscriptions');
  user.pushSubscriptions = (user.pushSubscriptions || []).filter(
    (sub) => sub.endpoint !== endpoint
  );
  await user.save();
  res.json({ success: true, data: { subscribed: false } });
});

module.exports = {
  getMine,
  markRead,
  markAllRead,
  remove,
  getVapidKey,
  subscribe,
  unsubscribe,
  subscribeValidation,
};
