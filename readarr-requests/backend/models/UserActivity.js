const mongoose = require('mongoose');

const UserActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activity: {
    type: String,
    required: true,
    enum: ['search', 'login', 'view_book', 'request_book', 'reading']
  },
  details: {
    type: Object,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for better query performance
UserActivitySchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('UserActivity', UserActivitySchema);