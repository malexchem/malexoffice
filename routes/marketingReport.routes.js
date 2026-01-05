const router = require('express').Router();
const controller = require('../controllers/MarketingReportController');

// Create new report
router.post('/', controller.createReport);

// Get all reports with pagination and filtering
router.get('/', controller.getAllReports);

// Get single report
router.get('/:id', controller.getReportById);

// Update report
router.put('/:id', controller.updateReport);

// Delete report
router.delete('/:id', controller.deleteReport);

// Get summary statistics
router.get('/summary/stats', controller.getSummary);

// Sync reports
router.post('/sync', controller.syncReports);

module.exports = router;