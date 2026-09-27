const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/patientProfileController');

router.get('/profile', protect, c.getProfile);
router.put('/profile', protect, c.profileValidation, c.upsertProfile);
router.get('/timeline', protect, c.getTimeline);
router.get('/vitals', protect, c.getVitals);
router.post('/vitals', protect, c.vitalValidation, c.addVital);
router.delete('/vitals/:id', protect, c.idValidation, c.deleteVital);

module.exports = router;