const Transaction = require('../models/transaction');

exports.createTransaction = async (req, res, next) => {
    try {
        const tx = await Transaction.create(req.body);
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
