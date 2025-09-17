const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
//router.post('/logout', require('../middleware/auth'), ctrl.logout);

module.exports = router;