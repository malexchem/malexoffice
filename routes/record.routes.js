const router = require('express').Router();
const ctrl = require('../controllers/record.controller');

router.post('/', ctrl.createRecord);
router.post('/sync', ctrl.sync);
router.get('/', ctrl.getAll);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
