const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/doctorController');
const saved = require('../controllers/savedDoctorController');
const matchController = require('../controllers/doctorMatchController');

router.get('/', c.list);
router.get('/nearby', c.nearbyValidation, c.nearby);
router.get('/match', matchController.matchValidation, matchController.match);
router.get('/saved', protect, authorize('patient'), saved.listMySaved);
router.get('/me/availability', protect, authorize('doctor'), c.getMyAvailability);
router.post('/me/availability', protect, authorize('doctor'), c.slotValidation, c.addSlot);
router.put('/me/availability/:slotId', protect, authorize('doctor'), c.slotValidation, c.updateSlot);
router.delete('/me/availability/:slotId', protect, authorize('doctor'), c.deleteSlot);
router.get('/me', protect, authorize('doctor'), c.getMyProfile);
router.post('/me', protect, authorize('doctor'), c.profileValidation, c.createMyProfile);
router.put('/me', protect, authorize('doctor'), c.profileValidation, c.updateMyProfile);
router.put(
  '/me/verification',
  protect,
  authorize('doctor'),
  c.verificationDetailsValidation,
  c.submitVerificationDetails
);
router.get('/:id/slots', c.getSlotsByDate);
router.get('/:id/availability', c.getPublicAvailability);
router.put('/:id/verify', protect, authorize('admin'), c.verifyValidation, c.verifyDoctor);
router.post('/:id/save', protect, authorize('patient'), saved.saveDoctor);
router.delete('/:id/save', protect, authorize('patient'), saved.removeSavedDoctor);
router.get('/:id', c.getById);

module.exports = router;
