const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/enquiryController');

router.get('/', protect, authorize('patient'), c.getMine);
router.post('/', protect, authorize('patient'), c.createValidation, c.create);

module.exports = router;