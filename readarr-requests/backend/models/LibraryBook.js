// models/LibraryBook.js
const mongoose = require('mongoose');

const LibraryBookSchema = new mongoose.Schema({
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
  filePath: {
    type: String,
    required: true
  },
  fileFormat: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  calibreId: {
    type: String
  },
  readarrId: {
    type: String
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  lastReadAt: {
    type: Date
  },
  readCount: {
    type: Number,
    default: 0
  },
  // Track current reading position
  currentPosition: {
    type: Number,
    default: 0
  },
  // Favorite status
  isFavorite: {
    type: Boolean,
    default: false
  }
});

// Create a compound index on user and bookId to ensure uniqueness
LibraryBookSchema.index({ user: 1, bookId: 1 }, { unique: true });

module.exports = mongoose.model('LibraryBook', LibraryBookSchema);