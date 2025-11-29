const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
//const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const userController = require('../controllers/userController');
const { userRegisterValidator } = require('../middleware/validators');
const ctrll = require('../controllers/auth.controller');

router.get('/email/:email', ctrl.getByEmail);
router.get('/:id',  adminOnly, ctrl.getById);
router.get('/', ctrl.getAll);
router.put('/:name', ctrl.update);
//router.delete('/:id', adminOnly, ctrl.remove);
router.delete('/:id', ctrl.remove);
router.post('/createByAdmin',  adminOnly, ctrl.createByAdmin);
router.post('/updatePassword',  ctrl.updatePassword);
router.post('/register', userRegisterValidator, userController.registerUser);


router.post('/register', ctrll.register);
router.post('/login', ctrll.login);
//router.post('/logout', require('../middleware/auth'), ctrl.logout);

module.exports = router;
