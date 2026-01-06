const mongoose = require('mongoose');

const recordV2Schema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  // Store date and time separately but also as combined timestamp
  date: {
    type: String, // YYYY-MM-DD format
    required: true
  },
  time: {
    type: String, // HH:mm format
    required: true
  },
  timestamp: {
    type: Date, // Combined date-time for proper sorting
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  invoiceNo: String,
  cashSaleNo: String,
  quotationNo: String,
  documentType: {
    type: String,
    enum: ['invoice', 'cashSale', 'quotation'],
    required: true
  },
  facilitator: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  // Reference to original record if migrated
  originalRecordId: String,
  // Version marker
  version: {
    type: Number,
    default: 2
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

// Helper function to parse date and time into timestamp
recordV2Schema.statics.createTimestamp = function(dateStr, timeStr) {
  // Ensure time format has seconds
  const timeWithSeconds = timeStr.includes(':') ? 
    (timeStr.split(':').length === 2 ? `${timeStr}:00` : timeStr) : 
    `${timeStr}:00:00`;
  
  return new Date(`${dateStr}T${timeWithSeconds}`);
};

// Pre-save hook to set timestamp
recordV2Schema.pre('save', function(next) {
  if (this.date && this.time && !this.timestamp) {
    this.timestamp = this.constructor.createTimestamp(this.date, this.time);
  }
  next();
});

// Index for better performance
recordV2Schema.index({ timestamp: -1 });
recordV2Schema.index({ documentType: 1 });
recordV2Schema.index({ customerName: 1 });

const RecordV2 = mongoose.model('RecordV2', recordV2Schema);

module.exports = RecordV2;