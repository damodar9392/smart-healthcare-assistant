const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/remedyController');

router.post('/match', c.matchValidation, c.match);
router.get('/', protect, c.list);
router.get('/:id', protect, c.getById);
router.post('/', protect, authorize('doctor', 'admin'), c.writeValidation, c.create);
router.put('/:id', protect, authorize('doctor', 'admin'), c.writeValidation, c.update);
router.put('/:id/approval', protect, authorize('admin'), c.approvalValidation, c.approve);
router.delete('/:id', protect, authorize('doctor', 'admin'), c.remove);

module.exports = router;
