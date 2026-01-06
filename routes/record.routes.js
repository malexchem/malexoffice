/*const router = require('express').Router();
const ctrl = require('../controllers/record.controller');

router.post('/', ctrl.createRecord);
router.post('/sync', ctrl.sync);
router.get('/', ctrl.getAll);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/summary', ctrl.getSummary);

module.exports = router;
*/

const router = require('express').Router();
const ctrl = require('../controllers/record.controller');

// Unified API endpoints
router.post('/', ctrl.createRecord);
router.get('/', ctrl.getAll);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/summary', ctrl.getSummary);

// Backward compatibility endpoints
router.post('/sync', ctrl.sync);

// Optional migration endpoint
router.post('/migrate', ctrl.migrate);

module.exports = router;