const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
//const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.get('/email/:email', ctrl.getByEmail);
router.get('/:id',  adminOnly, ctrl.getById);
router.get('/', ctrl.getAll);
router.put('/:name', ctrl.update);
router.delete('/:id', adminOnly, ctrl.remove);
router.post('/createByAdmin',  adminOnly, ctrl.createByAdmin);
router.post('/updatePassword',  ctrl.updatePassword);

module.exports = router;