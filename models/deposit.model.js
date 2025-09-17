const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, enum: ['Boss', 'Sales', 'Other'] },
    amount: { type: Number, required: true, min: 0 },
    date:   { type: Date,   required: true },
    notes:  { type: String, default: '' },
    // owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deposit', depositSchema);