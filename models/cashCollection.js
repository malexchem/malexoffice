// models/cashCollection.js
const mongoose = require('mongoose');

const cashCollectionSchema = new mongoose.Schema({
  // Basic information
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Reference to sales document
  documentNumber: {
    type: String,
    required: true,
    trim: true
  },
  
  documentType: {
    type: String,
    enum: ['invoice', 'quotation', 'cash_sale'],
    required: true
  },
  
  // Payment details
  amountPaid: {
    type: Number,
    required: true,
    min: 0
  },
  
  modeOfPayment: {
    type: String,
    enum: ['mpesa', 'cash', 'cheque', 'bank_transfer', 'card'],
    required: true
  },
  
  // M-Pesa specific fields
  mpesaReference: {
    type: String,
    trim: true
  },
  
  mpesaPhone: {
    type: String,
    trim: true
  },
  
  // Cheque specific fields
  chequeNumber: {
    type: String,
    trim: true
  },
  
  chequeBank: {
    type: String,
    trim: true
  },
  
  chequeDate: {
    type: Date
  },
  
  // Bank transfer specific fields
  bankReference: {
    type: String,
    trim: true
  },
  
  bankName: {
    type: String,
    trim: true
  },
  
  // Additional information
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  collectedBy: {
    type: String,
    required: true,
    trim: true
  },
  
  // Status and tracking
  status: {
    type: String,
    enum: ['pending', 'verified', 'deposited', 'cancelled'],
    default: 'pending'
  },
  
  verifiedBy: {
    type: String,
    trim: true
  },
  
  verifiedAt: {
    type: Date
  },
  
  depositedToBank: {
    type: Boolean,
    default: false
  },
  
  depositDate: {
    type: Date
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  },
  
  // Audit trail
  createdBy: {
    type: String,
    required: true
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

// Indexes for better query performance
cashCollectionSchema.index({ documentNumber: 1 });
cashCollectionSchema.index({ customerName: 1 });
cashCollectionSchema.index({ paymentDate: -1 });
cashCollectionSchema.index({ modeOfPayment: 1 });
cashCollectionSchema.index({ status: 1 });

// Pre-save middleware to update timestamps
cashCollectionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-verify M-Pesa payments
  if (this.modeOfPayment === 'mpesa' && this.mpesaReference && this.status === 'pending') {
    this.status = 'verified';
    this.verifiedAt = new Date();
  }
  
  next();
});

// Static method to get summary
cashCollectionSchema.statics.getSummary = async function(startDate, endDate) {
  const matchStage = {};
  
  if (startDate || endDate) {
    matchStage.paymentDate = {};
    if (startDate) matchStage.paymentDate.$gte = new Date(startDate);
    if (endDate) matchStage.paymentDate.$lte = new Date(endDate);
  }

  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amountPaid' },
        totalCollections: { $sum: 1 },
        totalVerified: {
          $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] }
        },
        totalPending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        totalDeposited: {
          $sum: { $cond: ['$depositedToBank', 1, 0] }
        },
        byPaymentMode: {
          $push: {
            mode: '$modeOfPayment',
            amount: '$amountPaid'
          }
        }
      }
    },
    {
      $project: {
        totalAmount: 1,
        totalCollections: 1,
        totalVerified: 1,
        totalPending: 1,
        totalDeposited: 1,
        byPaymentMode: {
          $arrayToObject: {
            $map: {
              input: '$byPaymentMode',
              as: 'item',
              in: {
                k: '$$item.mode',
                v: { $sum: '$$item.amount' }
              }
            }
          }
        }
      }
    }
  ]);
};

const CashCollection = mongoose.model('CashCollection', cashCollectionSchema);

module.exports = CashCollection;