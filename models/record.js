// models/record.js
/*const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: Date,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  invoiceNo: String, 
  cashSaleNo: String, 
  quotationNo: String, 
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

  createdAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Add validation for exactly one document type
recordSchema.pre('validate', function(next) {
  const docTypes = [
    this.invoiceNo ? 1 : 0,
    this.cashSaleNo ? 1 : 0,
    this.quotationNo ? 1 : 0
  ].reduce((a, b) => a + b, 0);
  
  if (docTypes !== 1) {
    this.invalidate('documentType', 'Exactly one document type must be provided (invoiceNo, cashSaleNo, or quotationNo)');
  }
  next();
});

const Record = mongoose.model('Record', recordSchema);

module.exports = Record;*/

// models/record.js
const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // ✅ SINGLE source of truth for date & time (stored in UTC)
    dateTime: {
      type: Date,
      required: false,
    },

    customerName: {
      type: String,
      required: true,
      trim: true
    },

    // 🔒 Exactly ONE of these must exist
    invoiceNo: {
      type: String,
      sparse: true,
      index: true
    },
    cashSaleNo: {
      type: String,
      sparse: true,
      index: true
    },
    quotationNo: {
      type: String,
      sparse: true,
      index: true
    },

    facilitator: {
      type: String,
      required: true,
      trim: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    createdBy: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true // ✅ automatically adds createdAt & updatedAt
  }
);

// ✅ Enforce exactly ONE document type
recordSchema.pre('validate', function (next) {
  const docTypes = [
    this.invoiceNo ? 1 : 0,
    this.cashSaleNo ? 1 : 0,
    this.quotationNo ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  if (docTypes !== 1) {
    this.invalidate(
      'documentType',
      'Exactly one document type must be provided (invoiceNo, cashSaleNo, or quotationNo)'
    );
  }

  next();
});

const Record = mongoose.model('Record', recordSchema);
module.exports = Record;
