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
        let txDate;

        if (req.body.date) {
            // Parse date string in Nairobi time
            // If frontend sends "2025-11-25", assume current time for hours/minutes
            const now = DateTime.now().setZone('Africa/Nairobi');
            const inputDate = DateTime.fromISO(req.body.date, { zone: 'Africa/Nairobi' });

            // Combine date from input + current time
            txDate = inputDate.set({
                hour: now.hour,
                minute: now.minute,
                second: now.second
            }).toJSDate();
        } else {
            // If no date provided, just use current Nairobi time
            txDate = DateTime.now().setZone('Africa/Nairobi').toJSDate();
        }

        const tx = await Transaction.create({
            ...req.body,
            date: txDate
        });

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
