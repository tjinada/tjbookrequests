// controllers/libraryController.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
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
 * Get user's library (books tagged with their username)
 */
exports.getUserLibrary = async (req, res) => {
  try {
    log(`Getting library for user: ${req.user.username}`);
    
    // Get all books from Calibre (could be optimized with a direct search in the future)
    const allBooks = await calibreAPI.searchBooks('*');
    
    // Filter books that have user's username in tags
    const userBooks = allBooks.filter(book => {
      if (!book.tags || !Array.isArray(book.tags)) return false;
      return book.tags.some(tag => tag.toLowerCase() === req.user.username.toLowerCase());
    });
    
    log(`Found ${userBooks.length} books for user ${req.user.username}`);
    
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
    
    // Check user has access to this book (username is in tags)
    if (!book.tags || !book.tags.some(tag => tag.toLowerCase() === req.user.username.toLowerCase())) {
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
 * Download a book in specific format
 */
exports.downloadBook = async (req, res) => {
  try {
    const { id, format } = req.params;
    log(`Download request for book ID: ${id} in format: ${format} by user: ${req.user.username}`);
    
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
    
    // Check user has access to this book (username is in tags)
    if (!book.tags || !book.tags.some(tag => tag.toLowerCase() === req.user.username.toLowerCase())) {
      return res.status(403).json({ message: 'You do not have access to this book' });
    }
    
    // Determine if we should use API or direct download from Calibre Content Server
    const useContentServer = process.env.CALIBRE_SERVER_URL && !process.env.CALIBRE_USE_CLI_ONLY;
    
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
    
    if (!bookId || !deviceType) {
      return res.status(400).json({ message: 'Book ID and device type are required' });
    }
    
    log(`Send to device request - Book ID: ${bookId}, Device: ${deviceType}, User: ${req.user.username}`);
    
    // Get book details from Calibre
    const book = await calibreAPI.getBookDetails(bookId);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Check user has access to this book (username is in tags)
    if (!book.tags || !book.tags.some(tag => tag.toLowerCase() === req.user.username.toLowerCase())) {
      return res.status(403).json({ message: 'You do not have access to this book' });
    }
    
    // Determine the format to use based on device type
    let format = 'EPUB';
    if (deviceType === 'kindle') {
      format = 'MOBI'; // Kindle prefers MOBI or AZW3
    } else if (deviceType === 'kobo') {
      format = 'KEPUB'; // Kobo prefers KEPUB
    }
    
    // Option 1: Use Calibre's email sending capability if available
    if (process.env.CALIBRE_USE_CLI_ONLY === 'true' && process.env.CALIBRE_LIBRARY_PATH) {
      try {
        log(`Attempting to send via Calibre CLI to ${email}`);
        
        // Use Calibre CLI to send book via email
        const command = `calibre-smtp --attachment "${book.path}/${format}" --relay ${process.env.SMTP_HOST} --port ${process.env.SMTP_PORT} --username ${process.env.SMTP_USER} --password ${process.env.SMTP_PASS} ${process.env.SMTP_FROM} ${email} "Your book: ${book.title}" "Attached is your requested book: ${book.title} by ${book.author}."`;
        
        await execAsync(command);
        
        return res.json({ success: true, message: `Book "${book.title}" sent to ${email}` });
      } catch (cmdError) {
        log(`Error with Calibre email sending: ${cmdError.message}`);
        // Fall back to our own email implementation
      }
    }
    
    // Option 2: Use our own email sending implementation
    if (email) {
      // For Kobo, check if format conversion is needed
      if (deviceType === 'kobo' && !book.formats.includes('KEPUB')) {
        log('Converting to KEPUB format for Kobo');
        
        // This would need Calibre's ebook-convert utility
        // For now, return an error message
        return res.status(400).json({ message: 'KEPUB format not available and conversion not implemented yet' });
      }
      
      // Download the book file to a temporary location
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `${book.title.replace(/[/\\?%*:|"<>]/g, '_')}.${format.toLowerCase()}`);
      
      // This is a placeholder - actual implementation would need to download the file from Calibre
      // For now, return a message about the feature not being fully implemented
      return res.status(501).json({ message: 'Email sending from backend not fully implemented yet' });
    }
    
    // If we got here, we don't have a valid way to send
    return res.status(400).json({ message: 'Unable to send book to device' });
  } catch (error) {
    log(`Error sending book to device: ${error.message}`);
    res.status(500).json({ message: 'Error sending book to device', error: error.message });
  }
};

/**
 * Get book content for in-app reading
 */
exports.getBookForReading = async (req, res) => {
  try {
    const { id, format } = req.params;
    log(`Reading request for book ID: ${id} in format: ${format} by user: ${req.user.username}`);
    
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
    if (!book.tags || !book.tags.some(tag => tag.toLowerCase() === req.user.username.toLowerCase())) {
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