const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/doctorController');

router.get('/verification', protect, authorize('admin'), c.verificationList);
router.get('/verification/:id', protect, authorize('admin'), c.verificationDetail);
router.put('/verification/:id', protect, authorize('admin'), c.verifyValidation, c.verifyDoctor);

module.exports = router;