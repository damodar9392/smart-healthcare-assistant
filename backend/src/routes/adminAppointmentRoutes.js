const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/appointmentController');

router.get('/', protect, authorize('admin'), c.adminListValidation, c.adminList);

module.exports = router;