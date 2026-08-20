const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/sponsoredServiceController');

router.get('/', protect, authorize('admin'), c.adminList);
router.post('/', protect, authorize('admin'), c.writeValidation, c.create);
router.put('/:id', protect, authorize('admin'), c.writeValidation, c.update);
router.delete('/:id', protect, authorize('admin'), c.remove);

module.exports = router;