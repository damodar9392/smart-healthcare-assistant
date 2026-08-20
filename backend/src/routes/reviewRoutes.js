const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/reviewController');

router.get('/', protect, c.getMyReviews);
router.get('/doctor/:doctorId', c.listByDoctor);
router.post('/', protect, authorize('patient'), c.writeValidation, c.create);
router.put('/:id', protect, authorize('patient'), c.writeValidation, c.update);
router.delete('/:id', protect, c.remove);

module.exports = router;
