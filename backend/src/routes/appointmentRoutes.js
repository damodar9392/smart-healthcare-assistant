const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/appointmentController');

router.get('/me', protect, c.getMyAppointments);
router.get('/:id', protect, c.getById);
router.post('/', protect, authorize('patient'), c.bookValidation, c.book);
router.put('/:id/status', protect, c.statusValidation, c.updateStatus);
router.put('/:id/cancel', protect, c.cancel);
router.put('/:id/reschedule', protect, c.rescheduleValidation, c.reschedule);

module.exports = router;