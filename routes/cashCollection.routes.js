// routes/cashCollection.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/cashCollection.controller');

// Public routes (if any)

// Protected routes
router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/summary', controller.getSummary);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.patch('/:id/verify', controller.verify);
router.patch('/:id/deposit', controller.markAsDeposited);

module.exports = router;