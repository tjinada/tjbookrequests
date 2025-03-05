// models/Request.js
const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  cover: {
    type: String
  },
  isbn: {
    type: String
  },
  source: {
    type: String,
    enum: ['google', 'openLibrary', null],
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'available'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  readarrId: {
    type: String
  },
  readarrStatus: {
    type: String,
    enum: ['pending', 'added', 'downloaded', 'error'],
    default: 'pending'
  },
  readarrMessage: {
    type: String
  }
});

module.exports = mongoose.model('Request', RequestSchema);