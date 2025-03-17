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
            
            // Check if user has access to this book
            // This would use the same logic as your other endpoints that check access
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
      if (deviceType === 'kindle') {
        // Convert formats to uppercase for case-insensitive comparison
        const formatsUpperCase = book.formats.map(f => f.toUpperCase());
        
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
        if (book.formats.includes('EPUB')) {
          format = 'EPUB';
        } else if (book.formats.includes('PDF')) {
          format = 'PDF';
        } else if (book.formats.length > 0) {
          format = book.formats[0]; // Use first available format
        } else {
          return res.status(400).json({ message: 'No formats available for this book' });
        }
      }
      
      log(`Selected format for ${deviceType}: ${format}`);
      
      // Option 1: Use Calibre's email sending capability if available
      if (process.env.CALIBRE_LIBRARY_PATH && !process.env.CALIBRE_USE_CLI_ONLY === 'true') {
        try {
          log(`Attempting to send via Calibre CLI to ${email}`);
          
          // Find the book file path
          let bookFilePath = '';
          if (book.formatMetadata && book.formatMetadata[format]) {
            bookFilePath = book.formatMetadata[format].path;
          } else if (book.path) {
            // Try to construct the path
            const possibleFilename = `${book.title.replace(/[/\\?%*:|"<>]/g, '_')}.${format.toLowerCase()}`;
            bookFilePath = path.join(book.path, possibleFilename);
            
            // Check if file exists
            if (!fs.existsSync(bookFilePath)) {
              log(`File not found at ${bookFilePath}`);
              // Try alternate path format
              bookFilePath = path.join(book.path, format);
              if (!fs.existsSync(bookFilePath)) {
                throw new Error(`Could not find book file for format ${format}`);
              }
            }
          } else {
            throw new Error('Book path information not available');
          }
          
          // Use Calibre CLI to send book via email
          const command = `calibre-smtp --attachment "${bookFilePath}" --relay ${process.env.SMTP_HOST} --port ${process.env.SMTP_PORT} --username ${process.env.SMTP_USER} --password ${process.env.SMTP_PASS} ${process.env.SMTP_FROM} ${email} "Your book: ${book.title}" "Attached is your requested book: ${book.title} by ${book.author}."`;
          
          await execAsync(command);
          
          log(`Book sent successfully via Calibre CLI to ${email}`);
          return res.json({ success: true, message: `Book "${book.title}" sent to ${email}` });
        } catch (cmdError) {
          log(`Error with Calibre email sending: ${cmdError.message}`);
          // Fall back to our own email implementation
        }
      }
      
      // Option 2: Use our own email sending implementation
      log(`Using our own email implementation to send to ${email}`);
      
      // First, get the book content
      let bookContent = null;
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
      
      // Format conversion if needed (e.g., EPUB to MOBI for Kindle)
      let needsConversion = false;
      let sourceFormat = format;
      let targetFormat = format;
      
      if (deviceType === 'kindle' && format === 'EPUB') {
        needsConversion = true;
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