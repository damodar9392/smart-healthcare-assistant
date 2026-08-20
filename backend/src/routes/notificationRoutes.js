const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/notificationController');

router.get('/me', protect, c.getMine);
router.put('/me/read/:id', protect, c.markRead);
router.put('/me/read-all', protect, c.markAllRead);
router.delete('/me/:id', protect, c.remove);

module.exports = router;
