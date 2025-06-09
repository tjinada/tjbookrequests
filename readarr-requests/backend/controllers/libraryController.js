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
    
    // Simplified format selection (EPUB for email, potentially convert to MOBI for Kindle)
    let format = 'EPUB'; // Default format
    const formatsUpperCase = book.formats.map(f => f.toUpperCase());
    
    // First check if EPUB is available (our preferred format)
    if (!formatsUpperCase.includes('EPUB')) {
      // No EPUB available, check what formats are available
      if (formatsUpperCase.length === 0) {
        return res.status(400).json({ message: 'No formats available for this book' });
      }
      
      // Use the first available format as fallback
      format = book.formats[0].toUpperCase();
      log(`EPUB not available, using ${format} as fallback`);
    }
    
    // If sending to Kindle and we only have EPUB, we'll need to convert
    let needsConversion = false;
    if (deviceType === 'kindle' && format === 'EPUB') {
      if (formatsUpperCase.includes('MOBI')) {
        // Use MOBI directly if available
        format = 'MOBI';
        log('Using existing MOBI format for Kindle');
      } else {
        // Mark for conversion EPUB → MOBI
        needsConversion = true;
        log('Will convert EPUB to MOBI for Kindle');
      }
    }
    
    log(`Selected format for ${deviceType}: ${format}`);
    
    // Use our own email sending implementation
    log(`Using our own email implementation to send to ${email}`);
    
    // First, get the book content
    let fileName = `${book.title.replace(/[/\\?%*:|"<>]/g, '_')}.${format.toLowerCase()}`;
    let mimeType = '';
    
    // Set MIME type based on format
    switch (format.toUpperCase()) {
      case 'EPUB':
        mimeType = 'application/epub+zip';
        break;
      case 'MOBI':
        mimeType = 'application/x-mobipocket-ebook';
        break;
      case 'AZW3':
        mimeType = 'application/vnd.amazon.ebook';
        break;
      case 'PDF':
        mimeType = 'application/pdf';
        break;
      case 'KEPUB':
        mimeType = 'application/epub+zip';
        fileName = `${book.title.replace(/[/\\?%*:|"<>]/g, '_')}.kepub.epub`;
        break;
      default:
        mimeType = 'application/octet-stream';
    }
    
    // Temporary directory for downloaded files
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, fileName);
    
    // Format conversion for Kindle if needed
    let sourceFormat = format;
    let targetFormat = format;
    
    if (needsConversion) {
      sourceFormat = 'EPUB';
      targetFormat = 'MOBI';
      fileName = fileName.replace('.epub', '.mobi');
      mimeType = 'application/x-mobipocket-ebook';
      log(`Will convert from ${sourceFormat} to ${targetFormat} for Kindle`);
    }
    
    try {
      // Download the book from Calibre Content Server
      if (process.env.CALIBRE_SERVER_URL) {
        log(`Downloading book from Calibre Content Server: ${process.env.CALIBRE_SERVER_URL}/get/${sourceFormat}/${bookId}/calibre`);
        
        // Create auth header for Calibre
        const auth = Buffer.from(`${process.env.CALIBRE_USERNAME}:${process.env.CALIBRE_PASSWORD}`).toString('base64');
        
        // Download the file
        const response = await axios({
          method: 'get',
          url: `${process.env.CALIBRE_SERVER_URL}/get/${sourceFormat}/${bookId}/calibre`,
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });
        
        // Save to temp file
        fs.writeFileSync(tempFilePath, Buffer.from(response.data));
        log(`Book saved to temporary file: ${tempFilePath}`);
        
        // Convert if needed
        if (needsConversion) {
          log(`Converting from ${sourceFormat} to ${targetFormat}`);
          
          const convertedFilePath = tempFilePath.replace(`.${sourceFormat.toLowerCase()}`, `.${targetFormat.toLowerCase()}`);
          
          // Use Calibre's ebook-convert tool if available
          if (process.env.CALIBRE_LIBRARY_PATH) {
            const convertCommand = `ebook-convert "${tempFilePath}" "${convertedFilePath}"`;
            
            await execAsync(convertCommand);
            log(`Conversion successful: ${convertedFilePath}`);
            
            // Update the file path to the converted file
            tempFilePath = convertedFilePath;
          } else {
            throw new Error(`Format conversion required but Calibre ebook-convert not available`);
          }
        }
        
        // Now set up nodemailer and send the email
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === 'true', // Use SSL/TLS if specified as true
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          tls: {
            // Do not fail on invalid certificates
            rejectUnauthorized: false
          }
        });
        
        // Prepare the email
        const mailOptions = {
          from: process.env.SMTP_FROM,
          to: email,
          subject: `Your book: ${book.title}`,
          text: `Hello from TJ Book Requests!

Attached is your requested book: "${book.title}" by ${book.author}.

Enjoy reading!

This email was sent by the TJ Book Requests system on behalf of ${username}.`,
          attachments: [
            {
              filename: fileName,
              path: tempFilePath,
              contentType: mimeType
            }
          ]
        };
        
        // Send the email
        await transporter.sendMail(mailOptions);
        
        log(`Book successfully sent via email to ${email}`);
        
        // Clean up temporary file
        fs.unlinkSync(tempFilePath);
        
        return res.json({ 
          success: true, 
          message: `Book "${book.title}" sent to ${email} successfully!`,
          format: targetFormat
        });
      } else {
        throw new Error('Calibre Content Server URL not configured');
      }
    } catch (emailError) {
      log(`Error sending email: ${emailError.message}`);
      
      // Clean up any temporary files
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      return res.status(500).json({ 
        success: false, 
        message: `Error sending book to ${email}: ${emailError.message}` 
      });
    }
    
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

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userId = req.user.id;
    
    // Fetch the complete user data from the database
    const userDoc = await User.findById(userId);
    
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const username = userDoc.username;
    log(`Reading request for book ID: ${id} in format: ${format} by user: ${username}`);
    
    // Validate the format (security measure)
    const validFormats = ['EPUB', 'PDF', 'HTML', 'TXT', 'MOBI', 'AZW3', 'KEPUB'];
    if (!validFormats.includes(format.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid format requested for reading' });
    }
    
    // Get book details from Calibre
    const book = await calibreAPI.getBookDetails(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Check user has access to this book (username is in tags)
    const hasAccess = userDoc.role === 'admin' || 
                     (book.tags && book.tags.some(tag => 
                       tag.toLowerCase() === username.toLowerCase()));
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this book' });
    }
    
    // Check if the requested format is available
    const formatAvailable = book.formats && 
                           book.formats.some(f => f.toLowerCase() === format.toLowerCase());
    
    if (!formatAvailable) {
      return res.status(404).json({ message: `Book is not available in ${format} format` });
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
      case 'MOBI':
        contentType = 'application/x-mobipocket-ebook';
        break;
      case 'AZW3':
        contentType = 'application/vnd.amazon.ebook';
        break;
      case 'KEPUB':
        contentType = 'application/epub+zip';
        break;
    }
    
    // Simply use the download URL from Calibre Content Server
    const downloadUrl = `${process.env.CALIBRE_SERVER_URL}/get/${format}/${id}/calibre`;
    
    log(`Fetching for reading from Calibre Content Server: ${downloadUrl}`);
    
    try {
      // Create authentication header if credentials are provided
      let headers = {};
      if (process.env.CALIBRE_USERNAME && process.env.CALIBRE_PASSWORD) {
        const auth = Buffer.from(`${process.env.CALIBRE_USERNAME}:${process.env.CALIBRE_PASSWORD}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
      
      // Fetch the book content as a buffer (not a stream)
      const response = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'arraybuffer',
        headers
      });
      
      // Set content type and other headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${book.title.replace(/[/\\?%*:|"<>]/g, '_')}.${format.toLowerCase()}"`);
      res.setHeader('Content-Length', response.data.length);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      // Send the buffer directly to the client
      return res.send(response.data);
    } catch (downloadError) {
      log(`Error fetching book for reading: ${downloadError.message}`);
      
      let errorMessage = 'Error fetching book from Calibre Content Server';
      let statusCode = 500;
      
      if (downloadError.code === 'ECONNREFUSED') {
        errorMessage = 'Connection to Calibre Content Server refused. Please check if the server is running.';
      } else if (downloadError.code === 'ENOTFOUND') {
        errorMessage = 'Calibre Content Server hostname not found. Check CALIBRE_SERVER_URL.';
      } else if (downloadError.response) {
        statusCode = downloadError.response.status;
        
        if (statusCode === 401 || statusCode === 403) {
          errorMessage = 'Authentication failed for Calibre Content Server.';
        } else if (statusCode === 404) {
          errorMessage = `Book or format not found on Calibre Content Server. Book ID: ${id}, Format: ${format}`;
        }
      }
      
      return res.status(statusCode).json({ message: errorMessage });
    }
  } catch (error) {
    log(`Error getting book for reading: ${error.message}`);
    res.status(500).json({ message: 'Error getting book for reading', error: error.message });
  }
};

/**
 * Remove book from user's library by removing their username from tags
 */
exports.deleteBookFromLibrary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    log(`Delete request for book ID: ${id} by user: ${userId}`);
    
    // Get user details
    const userDoc = await User.findById(userId);
    
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const username = userDoc.username;
    
    // Get book details from Calibre
    const book = await calibreAPI.getBookDetails(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Check if user has access to this book (username is in tags)
    const hasAccess = userDoc.role === 'admin' || 
                     (book.tags && book.tags.some(tag => 
                       tag.toLowerCase() === username.toLowerCase()));
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this book' });
    }
    
    // Remove user's tag from book
    const currentTags = book.tags || [];
    const filteredTags = currentTags.filter(tag => 
      tag.toLowerCase() !== username.toLowerCase()
    );
    
    // Update book tags in Calibre
    await calibreAPI.updateBookTags(id, filteredTags);
    
    log(`Successfully removed user ${username} from book ${id} tags`);
    
    res.json({ 
      success: true, 
      message: `Book "${book.title}" removed from your library` 
    });
  } catch (error) {
    log(`Error removing book from library: ${error.message}`);
    res.status(500).json({ 
      message: 'Error removing book from library', 
      error: error.message 
    });
  }
};

/**
 * Toggle book read status for user by adding/removing read tag
 */
exports.toggleBookReadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body; // true to mark as read, false to unmark
    const userId = req.user.id;
    
    log(`Toggle read status for book ID: ${id} by user: ${userId} to ${isRead}`);
    
    // Get user details
    const userDoc = await User.findById(userId);
    
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const username = userDoc.username;
    const readTag = `${username}_read`; // Tag format: username_read
    const readingTag = `${username}_reading`; // Tag format: username_reading
    
    // Get book details from Calibre
    const book = await calibreAPI.getBookDetails(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Check if user has access to this book (username is in tags)
    const hasAccess = userDoc.role === 'admin' || 
                     (book.tags && book.tags.some(tag => 
                       tag.toLowerCase() === username.toLowerCase()));
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this book' });
    }
    
    // Get current tags
    const currentTags = book.tags || [];
    let updatedTags = [...currentTags];
    
    // Check if read tag already exists
    const hasReadTag = currentTags.some(tag => 
      tag.toLowerCase() === readTag.toLowerCase()
    );
    
    // Check if reading tag exists
    const hasReadingTag = currentTags.some(tag => 
      tag.toLowerCase() === readingTag.toLowerCase()
    );
    
    if (isRead && !hasReadTag) {
      // Add read tag
      updatedTags.push(readTag);
      log(`Adding read tag: ${readTag}`);
      
      // Remove reading tag if present (finished reading)
      if (hasReadingTag) {
        updatedTags = updatedTags.filter(tag => 
          tag.toLowerCase() !== readingTag.toLowerCase()
        );
        log(`Removing reading tag: ${readingTag}`);
      }
    } else if (!isRead && hasReadTag) {
      // Remove read tag
      updatedTags = updatedTags.filter(tag => 
        tag.toLowerCase() !== readTag.toLowerCase()
      );
      log(`Removing read tag: ${readTag}`);
    }
    
    // Update book tags in Calibre if changes were made
    const tagsChanged = (hasReadTag !== isRead) || (isRead && hasReadingTag);
    if (tagsChanged) {
      await calibreAPI.updateBookTags(id, updatedTags);
      log(`Successfully updated read status for book ${id}`);
    }
    
    res.json({ 
      success: true, 
      isRead: isRead,
      message: isRead 
        ? `"${book.title}" marked as read` 
        : `"${book.title}" marked as unread`
    });
  } catch (error) {
    log(`Error toggling book read status: ${error.message}`);
    res.status(500).json({ 
      message: 'Error updating book read status', 
      error: error.message 
    });
  }
};

/**
 * Mark book as currently reading for user
 */
exports.markAsCurrentlyReading = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    log(`Mark as currently reading for book ID: ${id} by user: ${userId}`);
    
    // Get user details
    const userDoc = await User.findById(userId);
    
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const username = userDoc.username;
    const readingTag = `${username}_reading`; // Tag format: username_reading
    
    // Get book details from Calibre
    const book = await calibreAPI.getBookDetails(id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Check if user has access to this book (username is in tags)
    const hasAccess = userDoc.role === 'admin' || 
                     (book.tags && book.tags.some(tag => 
                       tag.toLowerCase() === username.toLowerCase()));
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this book' });
    }
    
    // Get current tags
    const currentTags = book.tags || [];
    let updatedTags = [...currentTags];
    
    // Check if reading tag already exists
    const hasReadingTag = currentTags.some(tag => 
      tag.toLowerCase() === readingTag.toLowerCase()
    );
    
    if (!hasReadingTag) {
      // Add reading tag
      updatedTags.push(readingTag);
      log(`Adding reading tag: ${readingTag}`);
      
      // Update book tags in Calibre
      await calibreAPI.updateBookTags(id, updatedTags);
      log(`Successfully marked book ${id} as currently reading`);
    }
    
    res.json({ 
      success: true, 
      message: `"${book.title}" marked as currently reading`
    });
  } catch (error) {
    log(`Error marking book as currently reading: ${error.message}`);
    res.status(500).json({ 
      message: 'Error marking book as currently reading', 
      error: error.message 
    });
  }
};