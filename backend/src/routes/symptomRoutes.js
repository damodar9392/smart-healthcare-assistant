const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/symptomController');
const analysis = require('../controllers/analysisController');

router.post('/analyze', analysis.analyzeValidation, analysis.analyze);
router.get('/searches', protect, analysis.getMySearches);
router.get('/', c.list);
router.get('/:id', c.getById);
router.post('/', protect, authorize('admin'), c.writeValidation, c.create);
router.put('/:id', protect, authorize('admin'), c.writeValidation, c.update);
router.delete('/:id', protect, authorize('admin'), c.remove);

module.exports = router;
