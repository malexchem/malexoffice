const router = require('express').Router();
const controller = require('../controllers/custController');

// Create new customer
router.post('/', controller.createCustomer);

// Get all customers with pagination and filtering
router.get('/', controller.getAllCustomers);

// Get single customer
router.get('/:id', controller.getCustomerById);

// Update customer
router.put('/:id', controller.updateCustomer);

// Delete customer
router.delete('/:id', controller.deleteCustomer);

// Get customer statistics
router.get('/stats/summary', controller.getCustomerStats);

// Search customers
router.get('/search/quick', controller.searchCustomers);

module.exports = router;