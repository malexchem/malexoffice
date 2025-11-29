const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    date: {
        type: Date,
        required: false
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        
    },
    method: {
        type: String,
        enum: ['cash', 'bank', 'mpesa', 'card'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    reference: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['completed', 'pending'],
        default: 'completed'
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
