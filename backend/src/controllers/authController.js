const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const {
  isLoginLocked,
  getLoginLock,
  recordLoginFailure,
  clearLoginFailure,
} = require('../middleware/rateLimit');

const BCRYPT_ROUNDS = 12;

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

const sanitizeUser = (user) => {
  const obj = user.toObject();
  delete obj.passwordHash;
  return obj;
};

const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  body('phone')
    .matches(/^\+?[0-9\s()-]{7,15}$/)
    .withMessage('Valid phone number required'),
  body('role')
    .optional()
    .isIn(['patient', 'doctor'])
    .withMessage('Role must be either patient or doctor'),
  validate,
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role = 'patient' } = req.body;

  if (role === 'admin') {
    throw new ApiError(403, 'Admin accounts cannot be created publicly');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, phone, role });

  res.status(201).json({ success: true, user: sanitizeUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const identifier = String(email || '').toLowerCase().trim();

  if (isLoginLocked(identifier)) {
    const lock = getLoginLock(identifier);
    res.setHeader('Retry-After', lock.retryAfter);
    const seconds = Math.ceil(lock.retryAfter);
    const friendly = seconds < 60 ? `${seconds} second(s)` : `${Math.ceil(seconds / 60)} minute(s)`;
    throw new ApiError(429, `Too many failed attempts. Try again in ${friendly}.`);
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    recordLoginFailure(identifier);
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    recordLoginFailure(identifier);
    throw new ApiError(401, 'Invalid email or password');
  }

  clearLoginFailure(identifier);
  const token = signToken(user);
  res.json({ success: true, token, user: sanitizeUser(user) });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = { register, login, getMe, registerValidation, loginValidation };
