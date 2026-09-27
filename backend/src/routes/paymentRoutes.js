const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/paymentController');

router.get('/me', protect, authorize('patient'), c.getMyInvoices);
router.get('/me/:id', protect, c.idValidation, c.getById);
router.post('/me/:id/pay', protect, c.payValidation, c.payInvoice);

module.exports = router;