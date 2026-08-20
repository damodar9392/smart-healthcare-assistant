const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const roleValidation = [
  body('role')
    .isIn(['patient', 'doctor', 'admin'])
    .withMessage('Role must be patient, doctor or admin'),
  validate,
];

const list = asyncHandler(async (req, res) => {
  const { role, q } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = {};
  if (role) {
    filter.role = role;
  }
  if (q) {
    filter.$or = [
      { name: new RegExp(escapeRegex(q), 'i') },
      { email: new RegExp(escapeRegex(q), 'i') },
    ];
  }

  const [data, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const updateRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  if (user._id.equals(req.user._id)) {
    throw new ApiError(400, 'You cannot change your own role');
  }
  user.role = req.body.role;
  await user.save();
  res.json({ success: true, data: user });
});

const remove = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  if (user._id.equals(req.user._id)) {
    throw new ApiError(400, 'You cannot delete your own account');
  }
  await user.deleteOne();
  res.json({ success: true, message: 'User deleted' });
});

module.exports = { list, updateRole, remove, roleValidation };