const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const custSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  customerId: {
    type: String,
    required: false,
    unique: true,
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters long']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Basic phone validation - can be customized for your region
        return /^[0-9\-\+\s\(\)]{10,15}$/.test(v);
      },
      message: 'Please enter a valid phone number'
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Email is optional, but if provided must be valid
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  companyName: {
    type: String,
    trim: true
  },
  customerType: {
    type: String,
    enum: {
      values: ['individual', 'business', 'school', 'institution', 'other'],
      message: '{VALUE} is not a valid customer type'
    },
    required: [true, 'Customer type is required'],
    default: 'individual'
  },
  industry: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'prospect', 'suspended'],
      message: '{VALUE} is not a valid status'
    },
    required: [true, 'Status is required'],
    default: 'prospect'
  },
  priorityLevel: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'vip'],
      message: '{VALUE} is not a valid priority level'
    },
    required: [true, 'Priority level is required'],
    default: 'medium'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: String,
    required: true,
    trim: true
  },
  lastContactDate: {
    type: Date
  },
  totalPurchases: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0,
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
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
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Generate customer ID before saving
custSchema.pre('save', async function(next) {
  if (!this.customerId) {
    const count = await this.constructor.countDocuments();
    const prefix = 'CUST';
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = (count + 1).toString().padStart(5, '0');
    this.customerId = `${prefix}${year}${sequence}`;
  }
  next();
});

// Update timestamp on update
custSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

const Cust = mongoose.model('Cust', custSchema);

module.exports = Cust;