const mongoose = require('mongoose');

const marketingReportSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  reportTitle: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  transportMode: {
    type: String,
    enum: ['personal_car', 'public_transport', 'company_car', 'motorcycle', 'walking', 'other'],
    required: true
  },
  transportCost: {
    type: Number,
    required: true,
    min: 0
  },
  totalDistance: {
    type: Number,
    required: true,
    min: 0
  },
  startingPoint: {
    type: String,
    required: true
  },
  endingPoint: {
    type: String,
    required: true
  },
  salesMade: {
    type: String,
    required: true
  },
  challengesFaced: {
    type: String,
    required: true
  },
  achievements: {
    type: String,
    required: true
  },
  recommendations: {
    type: String,
    required: true
  },
  resourcesNeeded: {
    type: String,
    required: true
  },
  overallFeedback: {
    type: String,
    required: true
  },
  marketerName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed', 'approved'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const MarketingReport = mongoose.model('MarketingReport', marketingReportSchema);

module.exports = MarketingReport;