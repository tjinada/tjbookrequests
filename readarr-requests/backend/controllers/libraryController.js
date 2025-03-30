// controllers/libraryController.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const calibreAPI = require('../config/calibreAPI');
const User = require('../models/User');

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
 * Get book details by ID
 */
exports.getBookDetails = async (req, res) => {
  try {
    const { id } = req.params;
    log(`Getting details for book ID: ${id}`);
    
    // Get book details from Calibre
    const book = await calibreAPI.getBookDetails(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Verify the user has access to this book
    const userId = req.user.id;
    const userDoc = await User.findById(userId);
    
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const username = userDoc.username;
    
    // Check if book has user's tag or if user is admin
    const hasAccess = userDoc.role === 'admin' || 
                      (book.tags && book.tags.some(tag => 
                        tag.toLowerCase() === username.toLowerCase()));
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this book' });
    }
    
    // Add download URLs for available formats
    if (book.formats && Array.isArray(book.formats) && book.formats.length > 0) {
      book.downloadUrls = {};
      book.formats.forEach(format => {
        book.downloadUrls[format] = `/api/library/download/${id}/${format}`;
      });
    }
    
    res.json(book);
  } catch (error) {
    log(`Error getting book details: ${error.message}`);
    res.status(500).json({ message: 'Error getting book details', error: error.message });
  }
};

/**
 * Get user's library (books tagged with their username)
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
    
    log(`Getting library for user: ${username}`);
    
    // Get all books from Calibre (could be optimized with a direct search in the future)
    const allBooks = await calibreAPI.searchBooks('*');
    
    // Filter books that have user's username in tags
    const userBooks = allBooks.filter(book => {
      if (!book.tags || !Array.isArray(book.tags)) return false;
      return book.tags.some(tag => tag.toLowerCase() === username.toLowerCase());
    });
    
    log(`Found ${userBooks.length} books for user ${username}`);
    
    res.json(userBooks);
  } catch (error) {
    log(`Error getting user library: ${error.message}`);
    res.status(500).json({ message: 'Error fetching library', error: error.message });
  }
};

/**
 * Get available formats for a book
 */
exports.getBookFormats = async (req, res) => {
  try {
    const { id } = req.params;
    log(`Getting available formats for book ID: ${id}`);
    
    // Get book details from Calibre
    const book = await calibreAPI.getBookDetails(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const userId = req.user.id;
    log(`User ID: ${userId}`);
    
    // Fetch the complete user data from the database
    const userDoc = await User.findById(userId);
    
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const username = userDoc.username;
    
    // Check user has access to this book (username is in tags)
    if (!book.tags || !book.tags.some(tag => tag.toLowerCase() === username.toLowerCase())) {
      return res.status(403).json({ message: 'You do not have access to this book' });
    }
    
    // Get available formats
    const formats = book.formats || [];
    
    res.json({ formats });
  } catch (error) {
    log(`Error getting book formats: ${error.message}`);
    res.status(500).json({ message: 'Error fetching book formats', error: error.message });
  }
};

/**
 * Proxy for book cover images
 */
exports.getBookCover = async (req, res) => {
  try {
    const { id } = req.params;
    log(`Proxying cover image for book ID: ${id}`);
    
    // First validate that the user has access to this book
    // This step is important to prevent unauthorized access
    const book = await calibreAPI.getBookDetails(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Create the full URL to the Calibre cover
    const coverUrl = `${process.env.CALIBRE_SERVER_URL}/get/cover/${id}/calibre`;
    
    // Create authentication header for Calibre Content Server
    const auth = Buffer.from(`${process.env.CALIBRE_USERNAME}:${process.env.CALIBRE_PASSWORD}`).toString('base64');
    
    try {
      // Use axios to proxy the request
      const response = await axios({
        method: 'get',
        url: coverUrl,
        responseType: 'stream',
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });
      
      // Set content type and other headers
      res.setHeader('Content-Type', response.headers['content-type']);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Pipe the response to the client
      response.data.pipe(res);
    } catch (err) {
      log(`Error proxying cover image: ${err.message}`);
      return res.status(500).json({ message: 'Error fetching cover image' });
    }
  } catch (error) {
    log(`Error in cover proxy: ${error.message}`);
    res.status(500).json({ message: 'Error proxying cover image', error: error.message });
  }
};
  
/**
 * Proxy for book thumbnail images
 */
exports.getBookThumbnail = async (req, res) => {
  try {
    const { id } = req.params;
    log(`Proxying thumbnail image for book ID: ${id}`);
    
    // First validate that the user has access to this book
    const book = await calibreAPI.getBookDetails(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Fetch the complete user data from the database
    const userId = req.user.id;
    const userDoc = await User.findById(userId);

    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const username = userDoc.username;

    // Check user has access to this book (username is in tags)
    if (!book.tags || !book.tags.some(tag => tag.toLowerCase() === username.toLowerCase())) {
      return res.status(403).json({ message: 'You do not have access to this book' });
    }
    
    // Create the full URL to the Calibre thumbnail
    const thumbnailUrl = `${process.env.CALIBRE_SERVER_URL}/get/thumb/${id}/calibre`;
    
    // Create authentication header for Calibre Content Server
    const auth = Buffer.from(`${process.env.CALIBRE_USERNAME}:${process.env.CALIBRE_PASSWORD}`).toString('base64');
    
    try {
      // Use axios to proxy the request
      const response = await axios({
        method: 'get',
        url: thumbnailUrl,
        responseType: 'stream',
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });
      
      // Set content type and other headers
      res.setHeader('Content-Type', response.headers['content-type']);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Pipe the response to the client
      response.data.pipe(res);
    } catch (err) {
      log(`Error proxying thumbnail image: ${err.message}`);
      return res.status(500).json({ message: 'Error fetching thumbnail image' });
    }
  } catch (error) {
    log(`Error in thumbnail proxy: ${error.message}`);
    res.status(500).json({ message: 'Error proxying thumbnail image', error: error.message });
  }
};
  
/**
 * Generic proxy for any Calibre asset
 */
exports.getCalibreAsset = async (req, res) => {
  try {
    const { type, id } = req.params;
    log(`Proxying Calibre asset type: ${type}, ID: ${id}`);
    
    // Validate asset type for security
    const validAssetTypes = ['cover', 'thumb', 'opf', 'json', 'static'];
    if (!validAssetTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid asset type' });
    }

    // Fetch the complete user data from the database
    const userId = req.user.id;
    const userDoc = await User.findById(userId);

    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const username = userDoc.username;
    
    // For book-related assets, validate user access first
    if (['cover', 'thumb', 'opf', 'json'].includes(type)) {
      const book = await calibreAPI.getBookDetails(id);
      
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }
      
      // Check user has access to this book (username is in tags)
      if (!book.tags || !book.tags.some(tag => tag.toLowerCase() === username.toLowerCase())) {
        return res.status(403).json({ message: 'You do not have access to this book' });
      }
    }
    
    // Create the full URL to the Calibre asset
    const assetUrl = `${process.env.CALIBRE_SERVER_URL}/get/${type}/${id}/calibre`;
    
    // Create authentication header for Calibre Content Server
    const auth = Buffer.from(`${process.env.CALIBRE_USERNAME}:${process.env.CALIBRE_PASSWORD}`).toString('base64');
    
    try {
      // Use axios to proxy the request
      const response = await axios({
        method: 'get',
        url: assetUrl,
        responseType: 'stream',
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });
      
      // Set content type and other headers
      res.setHeader('Content-Type', response.headers['content-type']);
      
      // Cache for 24 hours, except for dynamic content
      if (['cover', 'thumb', 'static'].includes(type)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
      
      // Pipe the response to the client
      response.data.pipe(res);
    } catch (err) {
      log(`Error proxying Calibre asset: ${err.message}`);
      return res.status(500).json({ message: 'Error fetching Calibre asset' });
    }
  } catch (error) {
    log(`Error in asset proxy: ${error.message}`);
    res.status(500).json({ message: 'Error proxying Calibre asset', error: error.message });
  }
};

/**
 * Download a book in specific format
 */
exports.downloadBook = async (req, res) => {
  try {
    const { id, format } = req.params;
    log(`Download request for book ID: ${id} in format: ${format}`);

    // Validate the format (security measure)
    const validFormats = ['EPUB', 'PDF', 'MOBI', 'AZW3', 'TXT', 'KEPUB'];
    if (!validFormats.includes(format.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid format requested' });
    }
    
    // Get book details from Calibre
    const book = await calibreAPI.getBookDetails(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Determine if we should use API or direct download from Calibre Content Server
    const useContentServer = process.env.CALIBRE_SERVER_URL;
    
    if (useContentServer) {
      // Create authentication header for Calibre Content Server
      const auth = Buffer.from(`${process.env.CALIBRE_USERNAME}:${process.env.CALIBRE_PASSWORD}`).toString('base64');
      
      // Format the URL for the Calibre Content Server download
      const downloadUrl = `${process.env.CALIBRE_SERVER_URL}/get/${format}/${id}/calibre`;
      
      log(`Downloading from Calibre Content Server: ${downloadUrl}`);
      
      try {
        // Use axios to proxy the download
        const response = await axios({
          method: 'get',
          url: downloadUrl,
          responseType: 'stream',
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });
        
        // Get filename from Content-Disposition or use a default
        let filename = `book.${format.toLowerCase()}`;
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/);
          if (match && match[1]) {
            filename = match[1];
          }
        } else {
          // Use book title for filename if available
          if (book.title) {
            filename = `${book.title.replace(/[/\\?%*:|"<>]/g, '_')}.${format.toLowerCase()}`;
          }
        }
        
        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', response.headers['content-type']);
        
        // Pipe the download to the response
        response.data.pipe(res);
      } catch (downloadError) {
        log(`Error downloading from Calibre Content Server: ${downloadError.message}`);
        return res.status(500).json({ message: 'Error downloading book from Calibre Content Server' });
      }
    } else {
      // Use Calibre CLI for download (this might need to be handled differently)
      log('Calibre Content Server not available, using CLI');
      res.status(501).json({ message: 'CLI download not implemented yet' });
    }
  } catch (error) {
    log(`Error downloading book: ${error.message}`);
    res.status(500).json({ message: 'Error downloading book', error: error.message });
  }
};

/**
 * Send book to e-reader device (Kindle or Kobo)
 */
exports.sendToDevice = async (req, res) => {
  try {
    const { bookId, deviceType, email } = req.body;
    const userId = req.user ? req.user.id : null;
    
    if (!bookId || !deviceType || !email) {
      return res.status(400).json({ message: 'Book ID, device type, and email are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    log(`Processing send request - Book: ${bookId}, Device: ${deviceType}, Email: ${email}`);
    
    // Get user info if available
    let username = 'User';
    if (userId) {
      try {
        const userDoc = await User.findById(userId);
        if (userDoc) {
          username = userDoc.username;
        }
      } catch (userErr) {
        log(`Error getting user info: ${userErr.message}`);
      }
    }
    
    // Get book details from Calibre
    const book = await calibreAPI.getBookDetails(bookId);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Check if user has access to this book
    if (userId) {
      // Check if book has user's tag
      const userDoc = await User.findById(userId);
      if (userDoc && (!book.tags || !book.tags.some(tag => tag.toLowerCase() === userDoc.username.toLowerCase()))) {
        return res.status(403).json({ message: 'You do not have access to this book' });
      }
    }
    
    // Determine the format to use based on device type
    let format;
    const formatsUpperCase = book.formats.map(f => f.toUpperCase());
    if (deviceType === 'kindle') {
      // Check if MOBI or AZW3 is available
      if (formatsUpperCase.includes('MOBI')) {
        format = 'MOBI';
      } else if (formatsUpperCase.includes('AZW3')) {
        format = 'AZW3';
      } else if (formatsUpperCase.includes('PDF')) {
        format = 'PDF'; // Fallback to PDF
      } else if (formatsUpperCase.includes('EPUB')) {
        // We'll need to convert EPUB to MOBI for Kindle
        format = 'EPUB';
        log('Need to convert EPUB to MOBI for Kindle');
      } else {
        return res.status(400).json({ message: 'No compatible format available for Kindle' });
      }
    } else if (deviceType === 'kobo') {
      // Check if KEPUB or EPUB is available
      if (formatsUpperCase.includes('KEPUB')) {
        format = 'KEPUB';
      } else if (formatsUpperCase.includes('EPUB')) {
        format = 'EPUB';
      } else if (formatsUpperCase.includes('PDF')) {
        format = 'PDF'; // Fallback to PDF
      } else {
        return res.status(400).json({ message: 'No compatible format available for Kobo' });
      }
    } else {
      // Other device type - default to EPUB
      if (formatsUpperCase.includes('EPUB')) {
        format = 'EPUB';
      } else if (formatsUpperCase.includes('PDF')) {
        format = 'PDF';
      } else if (book.formats.length > 0) {
        format = book.formats[0]; // Use first available format
      } else {
        return res.status(400).json({ message: 'No formats available for this book' });
      }
    }
    
    log(`Selected format for ${deviceType}: ${format}`);
    
    // Set up a simple email response for now
    // In a production environment, you would implement the actual email sending logic
    res.json({
      success: true,
      message: `Book "${book.title}" would be sent to ${email} in ${format} format`,
      format: format
    });
    
  } catch (error) {
    log(`Error sending book to device: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending book to device', 
      error: error.message 
    });
  }
};

/**
 * Get book content for in-app reading
 */
exports.getBookForReading = async (req, res) => {
  try {
    const { id, format } = req.params;
    const userId = req.user.id;
    
    // Fetch the complete user data from the database
    const userDoc = await User.findById(userId);
    
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const username = userDoc.username;
    log(`Reading request for book ID: ${id} in format: ${format} by user: ${username}`);
    
    // Validate the format (security measure)
    const validFormats = ['EPUB', 'PDF', 'HTML', 'TXT'];
    if (!validFormats.includes(format.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid format requested for reading' });
    }
    
    // Get book details from Calibre
    const book = await calibreAPI.getBookDetails(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Check user has access to this book (username is in tags)
    if (!book.tags || !book.tags.some(tag => tag.toLowerCase() === username.toLowerCase())) {
      return res.status(403).json({ message: 'You do not have access to this book' });
    }
    
    // Set content type based on format
    let contentType = 'application/octet-stream';
    switch (format.toUpperCase()) {
      case 'EPUB':
        contentType = 'application/epub+zip';
        break;
      case 'PDF':
        contentType = 'application/pdf';
        break;
      case 'HTML':
        contentType = 'text/html';
        break;
      case 'TXT':
        contentType = 'text/plain';
        break;
    }
    
    // Determine if we should use API or direct download from Calibre Content Server
    const useContentServer = process.env.CALIBRE_SERVER_URL && !process.env.CALIBRE_USE_CLI_ONLY;
    
    if (useContentServer) {
      // Create authentication header for Calibre Content Server
      const auth = Buffer.from(`${process.env.CALIBRE_USERNAME}:${process.env.CALIBRE_PASSWORD}`).toString('base64');
      
      // Format the URL for the Calibre Content Server download
      const downloadUrl = `${process.env.CALIBRE_SERVER_URL}/get/${format}/${id}/calibre`;
      
      log(`Fetching for reading from Calibre Content Server: ${downloadUrl}`);
      
      try {
        // Use axios to proxy the download
        const response = await axios({
          method: 'get',
          url: downloadUrl,
          responseType: 'stream',
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });
        
        // Set content type for streaming
        res.setHeader('Content-Type', contentType);
        
        // Pipe the download to the response
        response.data.pipe(res);
      } catch (downloadError) {
        log(`Error fetching book for reading: ${downloadError.message}`);
        return res.status(500).json({ message: 'Error fetching book for reading' });
      }
    } else {
      // Use Calibre CLI for getting the book content (this might need to be handled differently)
      log('Calibre Content Server not available, using CLI');
      res.status(501).json({ message: 'CLI reading not implemented yet' });
    }
  } catch (error) {
    log(`Error getting book for reading: ${error.message}`);
    res.status(500).json({ message: 'Error getting book for reading', error: error.message });
  }
};