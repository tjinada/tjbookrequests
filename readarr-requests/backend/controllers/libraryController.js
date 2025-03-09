// controllers/libraryController.js
const User = require('../models/User');
const calibreAPI = require('../config/calibreAPI');
const axios = require('axios');
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
 * Get available formats for a book
 */
exports.getBookFormats = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    
    // Fetch the complete user data from the database
    const userDoc = await User.findById(userId);
    
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const username = userDoc.username;

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

/**
 * Get download link for a specific book
 */
exports.getBookDownloadLink = async (req, res) => {
  try {
    const { bookId, format } = req.params;
    const userId = req.user.id;
    
    // Get user info
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    const username = userDoc.username;

    log(`Generating download for book ID: ${bookId}, format: ${format}, user: ${username}`);

    // First, verify the book belongs to the user's library
    const bookDetails = await calibreAPI.getBookDetails(bookId);
    
    // Check if the book's tags include the user's username
    const hasUserTag = bookDetails.tags && bookDetails.tags.includes(username);
    
    if (!hasUserTag) {
      log(`Access denied: Book ${bookId} does not belong to user ${username}`);
      return res.status(403).json({ message: 'This book is not in your library' });
    }
    
    // Normalize format
    const formatUpper = format.toUpperCase();
    
    // Get Calibre credentials
    const calibreServerUrl = process.env.CALIBRE_SERVER_URL;
    const calibreUsername = process.env.CALIBRE_USERNAME;
    const calibrePassword = process.env.CALIBRE_PASSWORD;
    
    const fileUrl = `${calibreServerUrl}/get/${formatUpper}/${bookId}/calibre`;
    
    log(`Attempting to download from Calibre URL: ${fileUrl}`);
    
    try {
      // Create a sanitized filename
      const filename = `${bookDetails.title.replace(/[/\\?%*:|"<>]/g, '-')}.${format.toLowerCase()}`;
      
      // Prepare Basic Auth header exactly like your curl command
      const basicAuth = Buffer.from(`${calibreUsername}:${calibrePassword}`).toString('base64');
      
      log('Sending download request with Basic Auth header');
      
      // Make the request with the Basic Auth header
      const response = await axios({
        method: 'get',
        url: fileUrl,
        headers: {
          'Authorization': `Basic ${basicAuth}`
        },
        responseType: 'stream',
        timeout: 30000, // 30 second timeout
        maxRedirects: 5
      });
      
      log(`Response status: ${response.status}`);
      
      // Set appropriate headers for the download
      if (formatUpper === 'EPUB') {
        res.setHeader('Content-Type', 'application/epub+zip');
      } else if (formatUpper === 'PDF') {
        res.setHeader('Content-Type', 'application/pdf');
      } else if (formatUpper === 'MOBI') {
        res.setHeader('Content-Type', 'application/x-mobipocket-ebook');
      } else {
        res.setHeader('Content-Type', 'application/octet-stream');
      }
      
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      
      // Additional headers to help browsers
      res.setHeader('Cache-Control', 'no-cache');
      
      // Pipe the stream directly to the response
      response.data.pipe(res);
      
      // Log success after the stream completes
      response.data.on('end', () => {
        log(`Download completed for book ${bookId}, format ${format}, user ${username}`);
      });
      
      // Handle errors in the stream
      response.data.on('error', (err) => {
        log(`Stream error: ${err.message}`);
      });
      
    } catch (requestError) {
      log(`Error requesting file from Calibre: ${requestError.message}`);
      
      // If we haven't sent headers yet, we can send an error response
      if (!res.headersSent) {
        return res.status(404).json({ 
          message: `Error downloading the book: ${requestError.message}`,
          error: requestError.message
        });
      }
    }
  } catch (error) {
    log(`Error in download process: ${error.message}`);
    
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Error downloading book', 
        error: error.message 
      });
    }
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
    
    // Get user info
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    const username = userDoc.username;

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
    
    // Determine which format to use based on device
    const preferredFormat = deviceType === 'kindle' ? 'MOBI' : 'EPUB';
    
    // Check if the book has the preferred format
    const formatAvailable = bookDetails.formats && 
      bookDetails.formats.some(f => f.toUpperCase().includes(preferredFormat));
    
    if (!formatAvailable) {
      return res.status(400).json({ 
        message: `${preferredFormat} format not available for this book`
      });
    }
    
    // Get the Calibre server URL and credentials
    const calibreServerUrl = process.env.CALIBRE_SERVER_URL;
    const calibreUsername = process.env.CALIBRE_USERNAME;
    const calibrePassword = process.env.CALIBRE_PASSWORD;
    const smtpServer = process.env.SMTP_SERVER;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USERNAME;
    const smtpPass = process.env.SMTP_PASSWORD;
    const fromEmail = process.env.SMTP_FROM;
    
    // Verify SMTP settings
    if (!smtpServer || !smtpPort || !smtpUser || !smtpPass || !fromEmail) {
      return res.status(500).json({ 
        message: 'E-reader sending is not configured on the server'
      });
    }
    
    // Download the book first
    const fileUrl = `${calibreServerUrl}/get/${preferredFormat}/${bookId}/calibre`;
    const basicAuth = Buffer.from(`${calibreUsername}:${calibrePassword}`).toString('base64');
    
    try {
      // Download the book content
      const response = await axios({
        method: 'get',
        url: fileUrl,
        headers: {
          'Authorization': `Basic ${basicAuth}`
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      log(`Downloaded book for e-reader sending: ${bookDetails.title}`);
      
      // Create a safe filename
      const filename = `${bookDetails.title.replace(/[/\\?%*:|"<>]/g, '-')}.${preferredFormat.toLowerCase()}`;
      
      // Set up nodemailer for sending email
      const nodemailer = require('nodemailer');
      
      // Create transport
      const transporter = nodemailer.createTransport({
        host: smtpServer,
        port: parseInt(smtpPort),
        secure: parseInt(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
      
      // Prepare the email
      const mailOptions = {
        from: `"Book Library" <${fromEmail}>`,
        to: email,
        subject: `Your requested book: ${bookDetails.title}`,
        text: `Here is your requested book: ${bookDetails.title} by ${bookDetails.author}`,
        attachments: [
          {
            filename: filename,
            content: response.data
          }
        ]
      };
      
      // Send the email
      const info = await transporter.sendMail(mailOptions);
      
      log(`Email sent: ${info.messageId}`);
      
      // Return success
      res.json({
        success: true,
        message: `Book successfully sent to your ${deviceType === 'kindle' ? 'Kindle' : 'Kobo'} device`,
        details: {
          emailSent: true,
          messageId: info.messageId
        }
      });
    } catch (emailError) {
      log(`Error sending book to e-reader: ${emailError.message}`);
      res.status(500).json({ 
        message: 'Error sending book to e-reader', 
        error: emailError.message 
      });
    }
  } catch (error) {
    log(`Error in send to e-reader process: ${error.message}`);
    res.status(500).json({ 
      message: 'Error sending book to e-reader', 
      error: error.message 
    });
  }
};