const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/prescriptionController');

router.get('/mine', protect, authorize('patient'), c.getMine);
router.get('/appointment/:appointmentId', protect, c.getForAppointment);
router.get('/:id', protect, c.idValidation, c.getById);
router.post('/', protect, authorize('doctor'), c.createValidation, c.create);
router.put('/:id', protect, c.idValidation, c.updateValidation, c.update);
router.delete('/:id', protect, c.idValidation, c.archive);

module.exports = router;