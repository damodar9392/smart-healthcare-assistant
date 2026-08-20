const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/remedyController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const notesValidation = [
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long'),
  validate,
];

router.get('/pending', protect, authorize('admin'), c.pendingList);
router.put('/:id/approve', protect, authorize('admin'), notesValidation, c.approveRemedy);
router.put('/:id/reject', protect, authorize('admin'), notesValidation, c.rejectRemedy);

module.exports = router;