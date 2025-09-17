const router = require('express').Router();
const ctrl = require('../controllers/deposit.controller');

router.route('/').get(ctrl.getDeposits).post(ctrl.createDeposit);
router
  .route('/:id')
  .get(ctrl.getDepositById)
  .put(ctrl.updateDeposit)
  .delete(ctrl.deleteDeposit);

module.exports = router;