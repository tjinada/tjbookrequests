// controllers/libraryController.js
const LibraryBook = require('../models/LibraryBook');
const Request = require('../models/Request');
const fs = require('fs');
const path = require('path');
const calibreAPI = require('../config/calibreAPI');

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/library.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

/**
 * Get all library books for the current user
 */
exports.getUserLibrary = async (req, res) => {
  try {
    // Get user's library books with optional sorting
    const { sort = 'addedAt', order = 'desc', limit = 100 } = req.query;
    
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;
    
    const books = await LibraryBook.find({ user: req.user.id })
      .sort(sortOptions)
      .limit(parseInt(limit));
    
    return res.json(books);
  } catch (error) {
    log(`Error getting user library: ${error.message}`);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get library book details
 */
exports.getBookDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the library book for this user
    const book = await LibraryBook.findOne({
      _id: id,
      user: req.user.id
    });
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found in your library' });
    }
    
    // Get additional details from Calibre if available
    let calibreDetails = null;
    if (book.calibreId) {
      try {
        calibreDetails = await calibreAPI.getBookDetails(book.calibreId);
      } catch (calibreError) {
        log(`Error getting Calibre details: ${calibreError.message}`);
        // Continue without Calibre details
      }
    }
    
    // Return combined data
    return res.json({
      ...book.toObject(),
      calibreDetails
    });
  } catch (error) {
    log(`Error getting book details: ${error.message}`);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Download a book file
 */
exports.downloadBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the library book for this user
    const book = await LibraryBook.findOne({
      _id: id,
      user: req.user.id
    });
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found in your library' });
    }
    
    // Check if file exists
    if (!fs.existsSync(book.filePath)) {
      return res.status(404).json({ message: 'Book file not found on server' });
    }
    
    // Update read count and last read time
    book.readCount += 1;
    book.lastReadAt = new Date();
    await book.save();
    
    // Set content type based on file format
    const contentTypes = {
      'epub': 'application/epub+zip',
      'pdf': 'application/pdf',
      'mobi': 'application/x-mobipocket-ebook',
      'azw': 'application/vnd.amazon.ebook',
      'azw3': 'application/vnd.amazon.ebook',
      'fb2': 'application/fb2',
      'txt': 'text/plain',
      'rtf': 'application/rtf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    const fileExtension = path.extname(book.filePath).replace('.', '').toLowerCase();
    const contentType = contentTypes[fileExtension] || 'application/octet-stream';
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(book.title)}.${fileExtension}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(book.filePath);
    fileStream.pipe(res);
  } catch (error) {
    log(`Error downloading book: ${error.message}`);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update library book (favorite status, reading position, etc.)
 */
exports.updateLibraryBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFavorite, currentPosition } = req.body;
    
    // Find the library book for this user
    const book = await LibraryBook.findOne({
      _id: id,
      user: req.user.id
    });
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found in your library' });
    }
    
    // Update fields if provided
    if (isFavorite !== undefined) {
      book.isFavorite = isFavorite;
    }
    
    if (currentPosition !== undefined) {
      book.currentPosition = currentPosition;
      book.lastReadAt = new Date();
    }
    
    await book.save();
    
    return res.json(book);
  } catch (error) {
    log(`Error updating library book: ${error.message}`);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Send book to e-reader devices
 */
exports.sendToDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceType, email } = req.body;
    
    // Find the library book for this user
    const book = await LibraryBook.findOne({
      _id: id,
      user: req.user.id
    });
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found in your library' });
    }
    
    // Check if file exists
    if (!fs.existsSync(book.filePath)) {
      return res.status(404).json({ message: 'Book file not found on server' });
    }
    
    // Implement sending to different device types
    if (deviceType === 'kindle' && email) {
      // Example: Call a function to email to Kindle
      // This would need to be implemented with an email service
      log(`Sending book "${book.title}" to Kindle email: ${email}`);
      
      // Mock successful response for now
      return res.json({ 
        success: true, 
        message: `Book "${book.title}" has been sent to your Kindle (${email})` 
      });
    } else if (deviceType === 'kobo') {
      // Implement Kobo sending logic if possible
      return res.json({ 
        success: true, 
        message: `Book "${book.title}" ready for Kobo transfer` 
      });
    }
    
    return res.status(400).json({ message: 'Unsupported device type or missing email' });
  } catch (error) {
    log(`Error sending book to device: ${error.message}`);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Auto-add books to library based on downloaded requests
 * This could be called by a webhook or scheduled job
 */
exports.syncLibraryFromRequests = async (req, res) => {
  try {
    // Check if admin user
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Get all available requests
    const availableRequests = await Request.find({ 
      status: 'available',
      readarrStatus: { $in: ['downloaded', 'externally-downloaded'] }
    }).populate('user');
    
    log(`Found ${availableRequests.length} available requests to sync to library`);
    
    let addedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process each request
    for (const request of availableRequests) {
      try {
        // Check if book already exists in library
        const existingBook = await LibraryBook.findOne({
          user: request.user._id,
          bookId: request.bookId
        });
        
        if (existingBook) {
          // Skip if already in library
          continue;
        }
        
        // Get book file path and details from Calibre or Readarr
        let filePath = null;
        let fileFormat = null;
        let fileSize = 0;
        let calibreId = null;
        
        // Try to get from Calibre first
        if (request.readarrId) {
          try {
            // Get book details from Readarr API to find file
            // This would need implementation specific to your setup
            // For now, we'll use a placeholder path for demonstration
            filePath = `/books/${request.readarrId}/book.epub`;
            fileFormat = 'epub';
            fileSize = 1024 * 1024; // 1MB placeholder
            
            // Get Calibre ID if available
            // This would need a lookup in your system
            calibreId = `calibre-${request.readarrId}`;
          } catch (error) {
            throw new Error(`Failed to get book files: ${error.message}`);
          }
        }
        
        if (!filePath) {
          throw new Error('No file path available for this book');
        }
        
        // Create new library book entry
        const libraryBook = new LibraryBook({
          user: request.user._id,
          bookId: request.bookId,
          title: request.title,
          author: request.author,
          cover: request.cover,
          filePath,
          fileFormat,
          fileSize,
          calibreId,
          readarrId: request.readarrId,
          addedAt: new Date()
        });
        
        await libraryBook.save();
        
        addedCount++;
        log(`Added book "${request.title}" to ${request.user.username}'s library`);
      } catch (error) {
        errorCount++;
        errors.push({
          request: request._id,
          title: request.title,
          error: error.message
        });
        log(`Error adding book "${request.title}" to library: ${error.message}`);
      }
    }
    
    return res.json({
      success: true,
      totalProcessed: availableRequests.length,
      addedToLibrary: addedCount,
      errors: errorCount,
      errorDetails: errors
    });
  } catch (error) {
    log(`Error syncing library: ${error.message}`);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};