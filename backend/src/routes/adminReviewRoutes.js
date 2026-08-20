const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/reviewController');

router.get('/', protect, authorize('admin'), c.adminList);
router.delete('/:reviewId', protect, authorize('admin'), c.remove);

module.exports = router;