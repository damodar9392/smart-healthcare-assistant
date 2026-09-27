const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/interactionController');

router.get('/catalog', protect, c.catalog);
router.post('/check', protect, c.checkValidation, c.check);

module.exports = router;