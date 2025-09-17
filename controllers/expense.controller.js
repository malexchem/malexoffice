const Expense = require('../models/expense.model');
const asyncHandler = require('express-async-handler');

// CREATE
exports.createExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create(req.body);
  res.status(201).json(expense);
});

// READ (all)
exports.getExpenses = asyncHandler(async (req, res) => {
  const data = await Expense.find().sort({ date: -1 });
  res.json(data);
});

// READ (single)
exports.getExpenseById = asyncHandler(async (req, res) => {
  const doc = await Expense.findById(req.params.id);
  if (!doc) return res.status(404).json({ msg: 'Not found' });
  res.json(doc);
});

// UPDATE
exports.updateExpense = asyncHandler(async (req, res) => {
  const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!updated) return res.status(404).json({ msg: 'Not found' });
  res.json(updated);
});

// DELETE
exports.deleteExpense = asyncHandler(async (req, res) => {
  const removed = await Expense.findByIdAndDelete(req.params.id);
  if (!removed) return res.status(404).json({ msg: 'Not found' });
  res.json({ msg: 'Deleted' });
});