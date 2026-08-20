const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/urgencyController');

router.post('/evaluate', c.evaluateValidation, c.evaluate);
router.get('/rules', protect, authorize('admin'), c.getRules);

module.exports = router;