const Deposit = require('../models/deposit.model');
const asyncHandler = require('express-async-handler');

exports.createDeposit = asyncHandler(async (req, res) => {
  const deposit = await Deposit.create(req.body);
  res.status(201).json(deposit);
});

exports.getDeposits = asyncHandler(async (req, res) => {
  const data = await Deposit.find().sort({ date: -1 });
  res.json(data);
});

exports.getDepositById = asyncHandler(async (req, res) => {
  const doc = await Deposit.findById(req.params.id);
  if (!doc) return res.status(404).json({ msg: 'Not found' });
  res.json(doc);
});

exports.updateDeposit = asyncHandler(async (req, res) => {
  const updated = await Deposit.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!updated) return res.status(404).json({ msg: 'Not found' });
  res.json(updated);
});

exports.deleteDeposit = asyncHandler(async (req, res) => {
  const removed = await Deposit.findByIdAndDelete(req.params.id);
  if (!removed) return res.status(404).json({ msg: 'Not found' });
  res.json({ msg: 'Deleted' });
});