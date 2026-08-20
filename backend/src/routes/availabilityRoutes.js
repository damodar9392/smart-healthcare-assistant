const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/doctorController');

router.get('/', protect, authorize('doctor'), c.getMyAvailability);
router.post('/', protect, authorize('doctor'), c.slotValidation, c.addSlot);

module.exports = router;