const express = require('express');
const router = express.Router();
const timeRecordController = require('../controllers/timeRecord.controller');

// Create time record
router.post('/', timeRecordController.createTimeRecord);

// Get all time records with optional filtering
router.get('/', timeRecordController.getAllTimeRecords);

// Get time summary for dashboard
router.get('/summary', timeRecordController.getTimeSummary);

// Get weekly attendance trend
router.get('/weekly-trend', timeRecordController.getWeeklyTrend);

// Get department punctuality
router.get('/department-punctuality', timeRecordController.getDepartmentPunctuality);

module.exports = router;
