const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    amount:       { type: Number, required: true, min: 0 },
    date:         { type: Date,   required: true },
    description:  { type: String, required: true, trim: true },
    vendor:       { type: String, required: true, trim: true },
    category:     { type: String, required: true, trim: true },
    paymentMethod:{ type: String, default: 'Cash' },
    notes:        { type: String, default: '' },
    // optional owner reference if you plug in auth later
    // owner:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);