const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

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

module.exports = { getMine, markRead, markAllRead, remove };
