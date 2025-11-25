/*const Transaction = require('../models/transaction');

exports.createTransaction = async (req, res, next) => {
    try {
        const tx = await Transaction.create(req.body);
        res.status(201).send({ success: true, transaction: tx });
    } catch (err) {
        console.error("[ERROR] Creating transaction:", err.message);
        next(err);
    }
};*/

const { DateTime } = require('luxon');
const Transaction = require('../models/transaction');

exports.createTransaction = async (req, res, next) => {
    try {
        // Convert the incoming date (or use now) to Nairobi time
        let txDate;
        if (req.body.date) {
            // If frontend sends a date string
            txDate = DateTime.fromISO(req.body.date, { zone: 'Africa/Nairobi' }).toJSDate();
        } else {
            // If no date provided, use current Nairobi time
            txDate = DateTime.now().setZone('Africa/Nairobi').toJSDate();
        }

        const txData = {
            ...req.body,
            date: txDate
        };

        const tx = await Transaction.create(txData);

        res.status(201).send({ success: true, transaction: tx });
    } catch (err) {
        console.error("[ERROR] Creating transaction:", err.message);
        next(err);
    }
};


exports.getAllTransactions = async (req, res, next) => {
    try {
        const list = await Transaction.find().sort({ date: -1 });
        res.send({ success: true, transactions: list });
    } catch (err) {
        next(err);
    }
};

exports.getTransactionById = async (req, res, next) => {
    try {
        const tx = await Transaction.findById(req.params.id);
        if (!tx) return res.status(404).send({ error: "Transaction not found" });

        res.send({ success: true, transaction: tx });
    } catch (err) {
        next(err);
    }
};

exports.updateTransaction = async (req, res, next) => {
    try {
        const tx = await Transaction.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        if (!tx) return res.status(404).send({ error: "Transaction not found" });

        res.send({ success: true, transaction: tx });
    } catch (err) {
        next(err);
    }
};

exports.deleteTransaction = async (req, res, next) => {
    try {
        const tx = await Transaction.findByIdAndDelete(req.params.id);
        if (!tx) return res.status(404).send({ error: "Transaction not found" });

        res.send({ success: true, message: "Transaction deleted" });
    } catch (err) {
        next(err);
    }
};
