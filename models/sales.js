// models/sales.js
const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema({
  // Reference to the original record
  recordId: {
    type: String,
    required: true,
    ref: 'Record'
  },
  
  // Sales document details
  documentType: {
    type: String,
    required: true,
    enum: ['invoice', 'cash_sale', 'quotation'],
    index: true
  },
  documentNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // Customer information
  customerName: {
    type: String,
    required: true
  },
  customerEmail: String,
  customerPhone: String,
  customerAddress: String,
  
  // Sales details
  date: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  
  // Payment information
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit', 'bank_transfer', 'check', 'mobile_money', null],
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'cancelled'],
    default: 'pending'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  balanceDue: {
    type: Number,
    default: function() {
      return this.totalAmount - this.paidAmount;
    }
  },
  
  // Sales items (for detailed accounting)
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    taxRate: Number
  }],
  
  // Accounting fields
  accountCode: {
    type: String,
    default: '4000' // Sales revenue account code
  },
  ledgerPosted: {
    type: Boolean,
    default: false
  },
  ledgerDate: Date,
  
  // Status and workflow
  status: {
    type: String,
    enum: ['draft', 'issued', 'approved', 'delivered', 'completed', 'cancelled'],
    default: 'issued'
  },
  salesPerson: String,
  facilitator: {
    type: String,
    required: true
  },
  
  // Additional metadata
  notes: String,
  termsAndConditions: String,
  validityPeriod: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Audit trail
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: String
}, {
  timestamps: true
});

// Indexes for better query performance
salesSchema.index({ date: -1 });
salesSchema.index({ customerName: 1 });
salesSchema.index({ documentType: 1, documentNumber: 1 });
salesSchema.index({ paymentStatus: 1 });
salesSchema.index({ status: 1 });

// Pre-save middleware to calculate total amount
/*salesSchema.pre('save', function(next) {
  // If items array exists, calculate total from items
  if (this.items && this.items.length > 0) {
    const itemsTotal = this.items.reduce((sum, item) => 
      sum + (item.totalPrice || 0), 0);
    
    // Use items total if amount is not explicitly set
    if (!this.amount && itemsTotal > 0) {
      this.amount = itemsTotal;
    }
  }
  
  // Calculate total amount
  this.totalAmount = (this.amount || 0) + (this.taxAmount || 0) - (this.discount || 0);
  
  // Calculate balance due
  this.balanceDue = this.totalAmount - (this.paidAmount || 0);
  
  // Update updatedAt timestamp
  this.updatedAt = new Date();
  
  next();
});*/
// In your Sales model
salesSchema.statics.createFromRecord = async function(record, additionalData = {}) {
  const documentNumber = record.invoiceNo || record.cashSaleNo || record.quotationNo;
  
  if (!documentNumber) {
    throw new Error('No document number found in record');
  }
  
  const salesData = {
    documentNumber,
    customerName: record.customerName,
    date: record.timestamp || record.time || record.date,
    amount: record.amount,
    totalAmount: record.amount,
    facilitator: record.facilitator,
    recordId: record.id,
    documentType: record.documentType || 
      (record.invoiceNo ? 'invoice' : 
       record.cashSaleNo ? 'cashSale' : 'quotation'),
    ...additionalData
  };
  
  return this.create(salesData);
};


// models/sales.js - Update the pre-save middleware
salesSchema.pre('save', function(next) {
  // If items array exists, calculate total from items
  if (this.items && this.items.length > 0) {
    const itemsTotal = this.items.reduce((sum, item) => 
      sum + (item.totalPrice || 0), 0);
    
    // Use items total if amount is not explicitly set
    if (!this.amount && itemsTotal > 0) {
      this.amount = itemsTotal;
    }
  }
  
  // Ensure total amount is calculated correctly
  this.totalAmount = (this.amount || 0) + (this.taxAmount || 0) - (this.discount || 0);
  
  // Always recalculate balance due based on paid amount
  this.balanceDue = this.totalAmount - (this.paidAmount || 0);
  
  // Update payment status based on amounts if not explicitly set
  if (this.balanceDue <= 0 && this.totalAmount > 0) {
    this.paymentStatus = 'paid';
  } else if (this.paidAmount > 0 && this.balanceDue > 0) {
    this.paymentStatus = 'partial';
  } else if (this.paidAmount === 0 && this.totalAmount > 0) {
    this.paymentStatus = 'pending';
  }
  
  // Update updatedAt timestamp
  this.updatedAt = new Date();
  
  next();
});

// Static method to create sales from record
salesSchema.statics.createFromRecord = async function(record, additionalData = {}) {
  let documentType, documentNumber;
  
  // Determine document type and number
  if (record.invoiceNo) {
    documentType = 'invoice';
    documentNumber = record.invoiceNo;
  } else if (record.cashSaleNo) {
    documentType = 'cash_sale';
    documentNumber = record.cashSaleNo;
  } else if (record.quotationNo) {
    documentType = 'quotation';
    documentNumber = record.quotationNo;
  } else {
    throw new Error('No valid document number found in record');
  }
  
  // Set payment status based on document type
  let paymentStatus = 'pending';
  let paymentMethod = null;
  
  if (documentType === 'cash_sale') {
    paymentStatus = 'paid';
    paymentMethod = 'cash';
  }
  
  // Create sales document
  const salesData = {
    recordId: record.id,
    documentType,
    documentNumber,
    customerName: record.customerName,
    date: record.date,
    amount: record.amount,
    totalAmount: record.amount,
    paymentMethod,
    paymentStatus,
    paidAmount: documentType === 'cash_sale' ? record.amount : 0,
    balanceDue: documentType === 'cash_sale' ? 0 : record.amount,
    facilitator: record.facilitator,
    createdBy: record.createdBy,
    ...additionalData
  };
  
  return this.create(salesData);
};

const Sales = mongoose.model('Sales', salesSchema);

module.exports = Sales;