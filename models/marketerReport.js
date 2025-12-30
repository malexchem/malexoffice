// models/marketerReport.js
const mongoose = require('mongoose');

const customerVisitSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  contactNumber: {
    type: String,
    trim: true
  },
  visitType: {
    type: String,
    enum: ['first_visit', 'follow_up', 'demo', 'sale', 'service'],
    default: 'follow_up'
  },
  status: {
    type: String,
    enum: ['interested', 'not_interested', 'follow_up_required', 'sold', 'pending'],
    default: 'pending'
  },
  productsDiscussed: [{
    type: String,
    trim: true
  }],
  feedback: {
    type: String,
    trim: true
  },
  issuesReported: {
    type: String,
    trim: true
  },
  nextFollowUpDate: {
    type: Date
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  attachments: [{
    type: String // URLs to uploaded images/documents
  }]
});

const marketerReportSchema = new mongoose.Schema({
  marketer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  title: {
    type: String,
    required: [true, 'Report title is required'],
    trim: true
  },
  startTime: {
    type: String, // "HH:MM" format
    required: true
  },
  endTime: {
    type: String, // "HH:MM" format
    required: true
  },
  totalDistance: {
    type: Number, // in kilometers
    default: 0
  },
  transportationMode: {
    type: String,
    enum: ['walking', 'bicycle', 'motorcycle', 'car', 'public_transport'],
    default: 'walking'
  },
  transportationCost: {
    type: Number,
    default: 0
  },
  customerVisits: [customerVisitSchema],
  leadsGenerated: {
    type: Number,
    default: 0
  },
  salesMade: {
    type: Number,
    default: 0
  },
  salesAmount: {
    type: Number,
    default: 0
  },
  challenges: {
    type: String,
    trim: true
  },
  achievements: {
    type: String,
    trim: true
  },
  recommendations: {
    type: String,
    trim: true
  },
  resourcesNeeded: {
    type: String,
    trim: true
  },
  overallFeedback: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed', 'approved', 'rejected'],
    default: 'draft'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewComments: {
    type: String,
    trim: true
  },
  locationData: {
    startLocation: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    endLocation: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    routePoints: [{
      latitude: Number,
      longitude: Number,
      timestamp: Date
    }]
  },
  submittedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
marketerReportSchema.index({ marketer: 1, date: -1 });
marketerReportSchema.index({ date: 1 });
marketerReportSchema.index({ status: 1 });
marketerReportSchema.index({ 'customerVisits.status': 1 });
marketerReportSchema.index({ 'customerVisits.nextFollowUpDate': 1 });

// Virtual for total visits
marketerReportSchema.virtual('totalVisits').get(function() {
  return this.customerVisits.length;
});

// Virtual for total working hours
marketerReportSchema.virtual('totalHours').get(function() {
  const [startHour, startMinute] = this.startTime.split(':').map(Number);
  const [endHour, endMinute] = this.endTime.split(':').map(Number);
  
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  
  let diff = endTotal - startTotal;
  if (diff < 0) diff += 24 * 60; // Handle overnight work
  
  return (diff / 60).toFixed(2);
});

// Virtual for efficiency score
marketerReportSchema.virtual('efficiencyScore').get(function() {
  let score = 0;
  
  // Base score for number of visits
  score += Math.min(this.totalVisits * 5, 50); // Max 50 points for visits
  
  // Points for sales
  score += Math.min(this.salesMade * 10, 30); // Max 30 points for sales
  
  // Points for leads generated
  score += Math.min(this.leadsGenerated * 2, 20); // Max 20 points for leads
  
  // Penalty for challenges
  if (this.challenges && this.challenges.length > 50) {
    score -= 10;
  }
  
  return Math.min(Math.max(score, 0), 100);
});

// Pre-save middleware
marketerReportSchema.pre('save', function(next) {
  // Calculate leads generated
  if (this.isModified('customerVisits')) {
    this.leadsGenerated = this.customerVisits.filter(
      visit => visit.status === 'interested' || visit.status === 'follow_up_required'
    ).length;
  }
  
  // Set submittedAt when status changes to submitted
  if (this.isModified('status') && this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('MarketerReport', marketerReportSchema);