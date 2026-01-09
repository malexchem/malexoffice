const router = require('express').Router();
const controller = require('../controllers/InventoryController');

// Inventory items routes
router.post('/', controller.createItem);
router.get('/', controller.getAllItems);
router.get('/search', controller.searchItems);
router.get('/categories', controller.getCategories);
router.get('/warehouses', controller.getWarehouses);
router.get('/stats', controller.getInventoryStats);
router.get('/:id', controller.getItemById);
router.put('/:id', controller.updateItem);
router.delete('/:id', controller.deleteItem);
router.post('/:id/stock', controller.updateStock);

// Inventory movements routes
router.get('/:id/movements', controller.getItemMovements);
router.get('/movements/all', controller.getAllMovements);

module.exports = router;