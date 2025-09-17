const mongoose = require('mongoose');
const { MONGO_URI } = require('../config');

module.exports = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[DB] Connected to MongoDB');
  } catch (err) {
    console.error('[DB] MongoDB connection error:', err);
    process.exit(1);
  }
};