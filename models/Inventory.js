const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const inventorySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  itemCode: {
    type: String,
    required: [true, 'Item code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    minlength: [2, 'Item name must be at least 2 characters long']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  unitOfMeasure: {
    type: String,
    required: [true, 'Unit of measure is required'],
    enum: {
      values: ['piece', 'box', 'kg', 'liter', 'meter', 'pack', 'carton', 'bottle', 'bag'],
      message: '{VALUE} is not a valid unit of measure'
    },
    default: 'piece'
  },
  brand: {
    type: String,
    trim: true
  },
  currentQuantity: {
    type: Number,
    required: [true, 'Current quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  minStockLevel: {
    type: Number,
    required: [true, 'Minimum stock level is required'],
    min: [0, 'Minimum stock level cannot be negative'],
    default: 10
  },
  maxStockLevel: {
    type: Number,
    min: [0, 'Maximum stock level cannot be negative']
  },
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  hasDiscount: {
    type: Boolean,
    default: false
  },
  discountPrice: {
    type: Number,
    min: [0, 'Discount price cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  warehouseName: {
    type: String,
    required: [true, 'Warehouse/store name is required'],
    trim: true
  },
  shelfLocation: {
    type: String,
    trim: true
  },
  supplierName: {
    type: String,
    trim: true
  },
  supplierContact: {
    type: String,
    trim: true
  },
  lastPurchaseDate: {
    type: Date
  },
  lastPurchasePrice: {
    type: Number,
    min: [0, 'Purchase price cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  status: {
    type: String,
    enum: {
      values: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
      message: '{VALUE} is not a valid status'
    },
    default: 'in_stock'
  },
  totalValue: {
    type: Number,
    min: [0, 'Total value cannot be negative'],
    default: 0,
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  notes: {
    type: String,
    trim: true
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

// Pre-save middleware to update stock status and total value
inventorySchema.pre('save', function(next) {
  // Update stock status based on current quantity
  if (this.currentQuantity <= 0) {
    this.status = 'out_of_stock';
  } else if (this.currentQuantity <= this.minStockLevel) {
    this.status = 'low_stock';
  } else {
    this.status = 'in_stock';
  }
  
  // Calculate total value
  this.totalValue = parseFloat((this.currentQuantity * this.costPrice).toFixed(2));
  
  next();
});

// Pre-update middleware
inventorySchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // If quantity is being updated, recalculate status
  if (update.$set && update.$set.currentQuantity !== undefined) {
    const currentQuantity = update.$set.currentQuantity;
    const minStockLevel = update.$set.minStockLevel || this._update.$set?.minStockLevel;
    
    if (currentQuantity <= 0) {
      update.$set.status = 'out_of_stock';
    } else if (minStockLevel && currentQuantity <= minStockLevel) {
      update.$set.status = 'low_stock';
    } else {
      update.$set.status = 'in_stock';
    }
    
    // Recalculate total value if quantity or cost price is updated
    const costPrice = update.$set.costPrice || this._update.$set?.costPrice;
    if (currentQuantity !== undefined && costPrice !== undefined) {
      update.$set.totalValue = parseFloat((currentQuantity * costPrice).toFixed(2));
    }
  }
  
  update.$set.updatedAt = new Date();
  next();
});

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;