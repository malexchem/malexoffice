// routes/recordsThree.js
const router = require('express').Router();
const ctrl = require('../controllers/record.controllerv3only');

// V2-only API endpoints
router.post('/', ctrl.createRecord);
router.get('/', ctrl.getAll);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/summary', ctrl.getSummary);

module.exports = router;