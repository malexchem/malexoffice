const express = require('express');
const router = express.Router();
const {
  getSalaryPayments,
  getSalaryStats
} = require('../controllers/salaryPaymentController');

router.route('/')
  .get(getSalaryPayments);

router.get('/stats', getSalaryStats);

module.exports = router;
