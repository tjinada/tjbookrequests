// controllers/webhookController.js
const Request = require('../models/Request');
const calibreAPI = require('../config/calibreAPI');
const fs = require('fs');
const path = require('path');

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/webhooks.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

exports.validateWebhook = (req, res, next) => {
  // Get webhook secret from header or query parameter
  const secret = req.headers['x-webhook-secret'] || req.query.secret;
  
  // Check if secret is valid
  if (secret !== process.env.WEBHOOK_SECRET) {
    log(`Invalid webhook secret: ${secret}`);
    return res.status(403).json({ message: 'Invalid webhook secret' });
  }
  
  // Log webhook received
  log(`Webhook received: ${req.method} ${req.originalUrl}`);
  
  next();
};

exports.processReadarrWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    // Log the event type
    log(`Processing webhook event: ${JSON.stringify(event.eventType)}`);
    
    // Check if this is a valid book event
    if (!event.eventType) {
      log('Invalid webhook: Missing eventType');
      return res.status(400).json({ message: 'Invalid webhook: Missing eventType' });
    }
    
    // Handle grab event (initial download)
    if (event.eventType === 'Grab') {
      log(`Book grab initiated: ${event.book?.title || 'Unknown'}`);
      
      // Nothing to do yet, but we could update request status
      return res.status(200).json({ 
        message: 'Grab event processed',
        event: 'grab'
      });
    }
    
    // Handle download/import event
    if (event.eventType === 'Download' || event.eventType === 'BookFileImport') {
      const bookId = event.book?.id;
      const bookTitle = event.book?.title || 'Unknown';
      const authorName = event.book?.authorName || 'Unknown';
      
      log(`Book import detected: ${bookTitle} by ${authorName} (ID: ${bookId})`);
      
      if (!bookId) {
        log('Missing book ID in webhook event');
        return res.status(400).json({ message: 'Missing book ID' });
      }
      
      // Find matching request in our database
      const request = await Request.findOne({ 
        readarrId: bookId.toString(),
        status: 'approved'
      }).populate('user', 'username');
      
      if (!request) {
        log(`No matching request found for book ID: ${bookId}`);
        return res.status(200).json({ 
          message: 'No matching request found',
          bookId
        });
      }
      
      log(`Found matching request from user: ${request.user.username}`);
      
      // Get file path 
      let filePath;
      
      if (event.bookFile && event.bookFile.path) {
        filePath = event.bookFile.path;
      } else if (event.importedBook && event.importedBook.path) {
        filePath = event.importedBook.path;
      } else {
        log('No file path found in webhook event');
        return res.status(200).json({ 
          message: 'No file path found, metadata update skipped',
          requestId: request._id
        });
      }
      
      log(`Book file path: ${filePath}`);
      
      // Update Calibre metadata to include username
      try {
        const metadataResult = await calibreAPI.updateBookMetadata(filePath, {
          user: request.user.username,
          userId: request.user._id.toString()
        });
        
        log(`Metadata updated successfully: ${JSON.stringify(metadataResult)}`);
        
        // Update request status
        request.status = 'available';
        request.readarrStatus = 'downloaded';
        request.readarrMessage = 'Book downloaded and metadata updated';
        await request.save();
        
        log(`Request updated to status: ${request.status}`);
        
        return res.status(200).json({ 
          message: 'Webhook processed successfully',
          bookId,
          requestId: request._id,
          user: request.user.username,
          metadataUpdated: true
        });
      } catch (metadataError) {
        log(`Error updating metadata: ${metadataError.message}`);
        
        // Still update request status but note the error
        request.status = 'available';
        request.readarrStatus = 'downloaded';
        request.readarrMessage = `Book downloaded but metadata update failed: ${metadataError.message}`;
        await request.save();
        
        return res.status(200).json({
          message: 'Book processed but metadata update failed',
          bookId,
          requestId: request._id,
          error: metadataError.message
        });
      }
    }
    
    // Other event types
    return res.status(200).json({ 
      message: 'Event not processed',
      eventType: event.eventType
    });
  } catch (error) {
    log(`Error processing webhook: ${error.message}`);
    return res.status(500).json({ message: 'Error processing webhook', error: error.message });
  }
};

// Handle test webhook for debugging
exports.testWebhook = (req, res) => {
  log('Test webhook received');
  log(`Headers: ${JSON.stringify(req.headers)}`);
  log(`Body: ${JSON.stringify(req.body)}`);
  
  return res.status(200).json({ 
    message: 'Test webhook received successfully',
    timestamp: new Date().toISOString(),
    headers: req.headers,
    body: req.body
  });
};