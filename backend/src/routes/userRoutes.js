const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/userController');

router.get('/', protect, authorize('admin'), c.list);
router.put('/:id/role', protect, authorize('admin'), c.roleValidation, c.updateRole);
router.delete('/:id', protect, authorize('admin'), c.remove);

module.exports = router;