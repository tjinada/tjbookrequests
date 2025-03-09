// controllers/libraryController.js
const calibreAPI = require('../config/calibreAPI');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

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
 * Get all books in the user's library (books tagged with their username)
 */
exports.getUserLibrary = async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Fetch the complete user data from the database
      const userDoc = await User.findById(userId);
      
      if (!userDoc) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const username = userDoc.username;
      
      log(`Fetching library books for user: ${username} (${userId})`);
  
      // Fetch books from Calibre where one of the tags matches the username
      const books = await calibreAPI.searchBooks(`tag:${username}`);
      
      log(`Found ${books.length} books in library for user: ${username}`);
      
      // Return the books as a formatted response
      res.json({
        count: books.length,
        books: books.map(book => ({
          id: book.id,
          title: book.title || 'Unknown Title',
          author: book.author || 'Unknown Author',
          cover: book.cover || null,
          thumbnail: book.thumbnail || null,
          formats: book.formats || [],
          tags: book.tags || [],
          added: book.added || '',
          uuid: book.uuid || '',
          path: book.path || '',
          publisher: book.publisher || '',
          rating: book.rating || 0,
          comments: book.comments || ''
        }))
      });
    } catch (error) {
      log(`Error fetching user library: ${error.message}`);
      res.status(500).json({ 
        message: 'Error fetching your library books', 
        error: error.message 
      });
    }
  };

/**
 * Get download link for a specific book
 */
exports.getBookDownloadLink = async (req, res) => {
  try {
    const { bookId, format } = req.params;
    const userId = req.user.id;
    const username = req.user.username;

    log(`Generating download link for book ID: ${bookId}, format: ${format}, user: ${username}`);

    // First, verify the book belongs to the user's library
    const bookDetails = await calibreAPI.getBookDetails(bookId);
    
    // Check if the book's tags include the user's username
    const hasUserTag = bookDetails.tags && bookDetails.tags.includes(username);
    
    if (!hasUserTag) {
      log(`Access denied: Book ${bookId} does not belong to user ${username}`);
      return res.status(403).json({ message: 'This book is not in your library' });
    }
    
    // Get the download URL based on the bookId and format
    const downloadUrl = await calibreAPI.getBookDownloadUrl(bookId, format);
    
    if (!downloadUrl) {
      return res.status(404).json({ message: `Format ${format} not available for this book` });
    }
    
    // Return the download URL
    res.json({
      bookId,
      format,
      downloadUrl
    });
  } catch (error) {
    log(`Error generating download link: ${error.message}`);
    res.status(500).json({ 
      message: 'Error generating download link', 
      error: error.message 
    });
  }
};

/**
 * Send book directly to e-reader
 */
exports.sendToEreader = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { email, deviceType } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    log(`Sending book ${bookId} to e-reader for user: ${username}, device: ${deviceType}`);

    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    if (!['kindle', 'kobo'].includes(deviceType)) {
      return res.status(400).json({ message: 'Device type must be either "kindle" or "kobo"' });
    }

    // First, verify the book belongs to the user's library
    const bookDetails = await calibreAPI.getBookDetails(bookId);
    
    // Check if the book's tags include the user's username
    const hasUserTag = bookDetails.tags && bookDetails.tags.includes(username);
    
    if (!hasUserTag) {
      log(`Access denied: Book ${bookId} does not belong to user ${username}`);
      return res.status(403).json({ message: 'This book is not in your library' });
    }
    
    // Now send the book to the e-reader
    let result;
    
    // Different handling based on device type
    if (deviceType === 'kindle') {
      // For Kindle, use Calibre's email sending functionality
      result = await calibreAPI.sendToKindle(bookId, email);
    } else if (deviceType === 'kobo') {
      // For Kobo, use Calibre's Kobo integration or direct email
      result = await calibreAPI.sendToKobo(bookId, email);
    }
    
    // Return success response
    res.json({
      success: true,
      message: `Book successfully sent to your ${deviceType} e-reader`,
      details: result
    });
  } catch (error) {
    log(`Error sending book to e-reader: ${error.message}`);
    res.status(500).json({ 
      message: 'Error sending book to e-reader', 
      error: error.message 
    });
  }
};

/**
 * Get available formats for a book
 */
exports.getBookFormats = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    const username = req.user.username;

    log(`Fetching available formats for book ID: ${bookId}, user: ${username}`);

    // First, verify the book belongs to the user's library
    const bookDetails = await calibreAPI.getBookDetails(bookId);
    
    // Check if the book's tags include the user's username
    const hasUserTag = bookDetails.tags && bookDetails.tags.includes(username);
    
    if (!hasUserTag) {
      log(`Access denied: Book ${bookId} does not belong to user ${username}`);
      return res.status(403).json({ message: 'This book is not in your library' });
    }
    
    // Get available formats
    const formats = bookDetails.formats || [];
    
    // Return the formats information
    res.json({
      bookId,
      availableFormats: formats
    });
  } catch (error) {
    log(`Error fetching book formats: ${error.message}`);
    res.status(500).json({ 
      message: 'Error fetching book formats', 
      error: error.message 
    });
  }
};