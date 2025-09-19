// routes/balance.routes.js
const router = require('express').Router();
const Expense = require('../models/expense.model');
const Deposit = require('../models/deposit.model');

router.get('/', async (req, res) => {
  try {
    const totalExpenses = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalDeposits = await Deposit.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      totalExpenses: totalExpenses[0]?.total || 0,
      totalDeposits: totalDeposits[0]?.total || 0,
      availableBalance: (totalDeposits[0]?.total || 0) - (totalExpenses[0]?.total || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;