const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/adminStatsController');

router.get('/', protect, authorize('admin'), c.getStats);

module.exports = router;