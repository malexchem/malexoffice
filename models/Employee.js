const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    required: true,
    enum: ['manager', 'sales', 'technician', 'admin', 'driver', 'other']
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['bank', 'mpesa', 'cash']
  },
  bankAccount: {
    accountNumber: String,
    bankName: String,
    branch: String
  },
  mpesaNumber: String,
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  dateJoined: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
employeeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Employee', employeeSchema);
