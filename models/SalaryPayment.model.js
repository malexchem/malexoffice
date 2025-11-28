const mongoose = require('mongoose');

const salaryPaymentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  basicSalary: {
    type: Number,
    required: true
  },
  commission: {
    type: Number,
    default: 0
  },
  allowances: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['bank', 'mpesa', 'cash']
  },
  paymentReference: String,
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paidAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: true
});

// Index for efficient queries
salaryPaymentSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
salaryPaymentSchema.index({ status: 1 });
salaryPaymentSchema.index({ paidAt: 1 });

module.exports = mongoose.model('SalaryPayment', salaryPaymentSchema);
