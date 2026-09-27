const router = require('express').Router();
const {
  register,
  login,
  getMe,
  registerValidation,
  loginValidation,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginRateLimit, registerRateLimit } = require('../middleware/rateLimit');

router.post('/register', registerRateLimit, registerValidation, register);
router.post('/login', loginRateLimit, loginValidation, login);
router.get('/me', protect, getMe);

module.exports = router;
