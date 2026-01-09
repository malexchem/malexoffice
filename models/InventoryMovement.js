const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const inventoryMovementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  itemId: {
    type: String,
    required: [true, 'Item ID is required'],
    ref: 'Inventory'
  },
  itemCode: {
    type: String,
    required: [true, 'Item code is required']
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required']
  },
  movementDate: {
    type: Date,
    required: [true, 'Movement date is required'],
    default: Date.now
  },
  movementType: {
    type: String,
    required: [true, 'Movement type is required'],
    enum: {
      values: ['in', 'out', 'adjustment', 'transfer', 'return'],
      message: '{VALUE} is not a valid movement type'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  previousQuantity: {
    type: Number,
    required: [true, 'Previous quantity is required']
  },
  newQuantity: {
    type: Number,
    required: [true, 'New quantity is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true
  },
  responsiblePerson: {
    type: String,
    required: [true, 'Responsible person is required'],
    trim: true
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate reference number before saving
inventoryMovementSchema.pre('save', async function(next) {
  if (!this.referenceNumber) {
    const count = await this.constructor.countDocuments();
    const prefix = 'MOV';
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const sequence = (count + 1).toString().padStart(4, '0');
    this.referenceNumber = `${prefix}${year}${month}${sequence}`;
  }
  next();
});

const InventoryMovement = mongoose.model('InventoryMovement', inventoryMovementSchema);

module.exports = InventoryMovement;