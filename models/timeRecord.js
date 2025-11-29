const mongoose = require('mongoose');

const timeRecordSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  sessionType: {
    type: String,
    required: true,
    enum: ['check-in', 'lunch-out', 'lunch-in', 'check-out']
  },
  recordedTime: {
    type: String, // Store as "HH:MM" format
    required: true
  },
  actualTime: {
    type: String, // Store as "HH:MM" format
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['on-time', 'late', 'early', 'overtime']
  },
  imageUrl: {
    type: String, // Cloudinary URL
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: 'General'
  }
}, {
  timestamps: true
});

// Index for efficient queries
timeRecordSchema.index({ employee: 1, date: 1, sessionType: 1 });
timeRecordSchema.index({ date: 1 });
timeRecordSchema.index({ department: 1 });

const TimeRecord = mongoose.model('TimeRecord', timeRecordSchema);

module.exports = TimeRecord;
