// models/customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  customerType: {
    type: String,
    enum: ['individual', 'business', 'corporate', 'government'],
    default: 'individual'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'lead', 'prospect', 'vip'],
    default: 'lead'
  },
  activityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  totalTransactions: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  averageTransactionValue: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  contactPerson: {
    name: String,
    position: String,
    email: String,
    phone: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  source: {
    type: String,
    enum: ['referral', 'website', 'social_media', 'walk_in', 'advertisement', 'other'],
    default: 'other'
  },
  // For communication preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
customerSchema.index({ email: 1 }, { unique: true });
customerSchema.index({ status: 1 });
customerSchema.index({ customerType: 1 });
customerSchema.index({ activityScore: -1 });
customerSchema.index({ lastActivity: -1 });
customerSchema.index({ name: 'text', email: 'text', company: 'text' });

// Virtual for full address
customerSchema.virtual('fullAddress').get(function() {
  const parts = [];
  if (this.address?.street) parts.push(this.address.street);
  if (this.address?.city) parts.push(this.address.city);
  if (this.address?.state) parts.push(this.address.state);
  if (this.address?.postalCode) parts.push(this.address.postalCode);
  if (this.address?.country) parts.push(this.address.country);
  return parts.join(', ');
});

// Virtual for display name
customerSchema.virtual('displayName').get(function() {
  return this.company ? `${this.name} (${this.company})` : this.name;
});

// Pre-save middleware to update activity score
customerSchema.pre('save', function(next) {
  // Update activity score based on various factors
  let score = 0;
  
  // Base score for status
  const statusScores = {
    'vip': 40,
    'active': 30,
    'prospect': 20,
    'lead': 10,
    'inactive': 0
  };
  score += statusScores[this.status] || 0;
  
  // Add score based on total transactions
  if (this.totalTransactions > 10) score += 30;
  else if (this.totalTransactions > 5) score += 20;
  else if (this.totalTransactions > 0) score += 10;
  
  // Add score based on recency of last activity
  const daysSinceLastActivity = (Date.now() - this.lastActivity) / (1000 * 60 * 60 * 24);
  if (daysSinceLastActivity < 7) score += 20;
  else if (daysSinceLastActivity < 30) score += 10;
  else if (daysSinceLastActivity < 90) score += 5;
  
  // Cap at 100
  this.activityScore = Math.min(100, score);
  
  // Update average transaction value
  if (this.totalTransactions > 0) {
    this.averageTransactionValue = this.totalSpent / this.totalTransactions;
  }
  
  next();
});

module.exports = mongoose.model('Customer', customerSchema);