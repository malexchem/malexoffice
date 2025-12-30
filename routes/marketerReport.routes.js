// routes/marketerReport.routes.js
const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReport,
  updateReport,
  deleteReport,
  submitReport,
  reviewReport,
  getMarketerStats,
  getMarketerPerformance,
  getPendingFollowUps,
  uploadAttachment
} = require('../controllers/marketerReportController');

// Protect routes (add your auth middleware)
// const { protect, authorize } = require('../middleware/auth');

// Apply authentication to all routes
// router.use(protect);

// Marketers can create, update, delete (drafts only), submit, and view their own reports
// Managers/Supervisors can view all, review, and get stats

router.route('/')
  .get(getReports)
  .post(createReport);

router.route('/stats/overview')
  .get(getMarketerStats);

router.route('/stats/performance')
  .get(getMarketerPerformance);

router.route('/follow-ups/pending')
  .get(getPendingFollowUps);

router.route('/:id')
  .get(getReport)
  .put(updateReport)
  .delete(deleteReport);

router.route('/:id/submit')
  .post(submitReport);

router.route('/:id/review')
  .post(reviewReport);

router.route('/:id/attachments')
  .post(uploadAttachment);

module.exports = router;