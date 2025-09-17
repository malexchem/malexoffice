const router = require('express').Router();
const ctrl = require('../controllers/expense.controller');

router.route('/').get(ctrl.getExpenses).post(ctrl.createExpense);
router
  .route('/:id')
  .get(ctrl.getExpenseById)
  .put(ctrl.updateExpense)
  .delete(ctrl.deleteExpense);

module.exports = router;