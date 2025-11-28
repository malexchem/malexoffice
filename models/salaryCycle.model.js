const mongoose = require('mongoose');

const salaryEntrySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
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
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  paidAt: Date,
  paymentReference: String
});

const salaryCycleSchema = new mongoose.Schema({
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
  cycleName: {
    type: String,
    required: true
  },
  paymentDate: {
    type: Date,
    required: true
  },
  employees: [salaryEntrySchema],
  status: {
    type: String,
    enum: ['draft', 'processing', 'completed', 'cancelled'],
    default: 'draft'
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date
}, {
  timestamps: true
});

// Calculate total amount before saving
salaryCycleSchema.pre('save', function(next) {
  this.totalAmount = this.employees.reduce((total, entry) => {
    return total + entry.basicSalary + entry.commission + entry.allowances - entry.deductions;
  }, 0);
  next();
});

// Index for efficient queries
salaryCycleSchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('SalaryCycle', salaryCycleSchema);
