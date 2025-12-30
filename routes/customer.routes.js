// routes/customer.routes.js
const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerActivity,
  updateCustomerActivity,
  getCustomerStats
} = require('../controllers/customerController');

// Protect routes (add your auth middleware)
// const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(getCustomers)
  .post(createCustomer);

router.route('/stats/overview')
  .get(getCustomerStats);

router.route('/:id')
  .get(getCustomer)
  .put(updateCustomer)
  .delete(deleteCustomer);

router.route('/:id/activity')
  .get(getCustomerActivity)
  .post(updateCustomerActivity);

module.exports = router;