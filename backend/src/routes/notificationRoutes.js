const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/notificationController');

router.get('/me', protect, c.getMine);
router.put('/me/read/:id', protect, c.markRead);
router.put('/me/read-all', protect, c.markAllRead);
router.delete('/me/:id', protect, c.remove);

router.get('/push/vapid-key', protect, c.getVapidKey);
router.post('/push/subscribe', protect, c.subscribeValidation, c.subscribe);
router.delete('/push/subscribe', protect, c.unsubscribe);

module.exports = router;