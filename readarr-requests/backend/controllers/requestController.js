// controllers/requestController.js
const Request = require('../models/Request');
const readarrAPI = require('../config/readarr');
const calibreAPI = require('../config/calibreAPI');
const googleBooksAPI = require('../config/googleBooks');
const openLibraryAPI = require('../config/openLibrary');
const notificationService = require('../services/notificationService');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/readarr.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

// Create direct Readarr API client for internal use
const readarrDirectAPI = axios.create({
  baseURL: process.env.READARR_API_URL,
  headers: {
    'X-Api-Key': process.env.READARR_API_KEY
  }
});

exports.createRequest = async (req, res) => {
  try {
    const { bookId, title, author, cover, isbn, source } = req.body;

    // Check if request already exists
    const existingRequest = await Request.findOne({ 
      user: req.user.id, 
      bookId 
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Book already requested' });
    }

    // Create new request
    const newRequest = new Request({
      user: req.user.id,
      bookId,
      title,
      author,
      cover,
      isbn,
      source
    });

    // Save the request
    await newRequest.save();
    
    // Send notification to admins about the new request
    try {
      // Get user details for the notification
      const userData = await Request.findById(newRequest._id)
        .populate('user', 'username email');
      
      const adminNotification = {
        title: 'New Book Request',
        body: `${userData.user.username} requested "${title}" by ${author}`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
          url: '/admin/requests',
          requestId: newRequest._id.toString(),
          bookId: bookId,
          type: 'new-book-request'
        },
        actions: [
          {
            action: 'view-requests',
            title: 'View Requests'
          }
        ]
      };
      
      await notificationService.sendAdminNotification(adminNotification);
      log(`Admin notification sent for new book request: "${title}"`);
    } catch (notifyError) {
      // Don't fail the request creation if notification fails
      log(`Failed to send admin notification: ${notifyError.message}`);
    }
    
    // Return the created request
    res.status(201).json(newRequest);
  } catch (err) {
    console.error('Error creating request:', err);
    res.status(500).send('Server error');
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    // Only admin can update request status
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'denied', 'available'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Store previous status for notification purposes
    const previousStatus = request.status;

    // If approving the request, add book to Readarr
    if (status === 'approved' && request.status !== 'approved') {
      try {
        log(`Processing request approval for: "${request.title}" by ${request.author}`);
        
        // Get more detailed book information based on source if available
        let enrichedBookData = {
          title: request.title,
          author: request.author,
          isbn: request.isbn
        };
        
        // If source is specified, get richer metadata
        if (request.source) {
          try {
            log(`Getting enhanced metadata from ${request.source} for book: ${request.bookId}`);
            let bookDetails;
            
            if (request.source === 'google') {
              // Remove 'gb-' prefix if present
              const googleId = request.bookId.startsWith('gb-') ? 
                request.bookId.substring(3) : request.bookId;
              bookDetails = await googleBooksAPI.getBookDetails(googleId);
            } else if (request.source === 'openLibrary') {
              // Remove 'ol-' prefix if present
              const olId = request.bookId.startsWith('ol-') ? 
                request.bookId.substring(3) : request.bookId;
              bookDetails = await openLibraryAPI.getBookDetails(olId);
            }
            
            if (bookDetails) {
              // Get author information for better matching
              let authorInfo = null;
              if (request.source === 'google' && bookDetails.author) {
                // Extract the primary author (first in the list)
                const primaryAuthor = bookDetails.author.split(',')[0].trim();
                try {
                  authorInfo = await googleBooksAPI.searchAuthor(primaryAuthor);
                  log(`Found author information for ${primaryAuthor}`);
                } catch (authorErr) {
                  log(`Error getting author info: ${authorErr.message}, will continue without it`);
                }
              }
              
              // Enhance book data with metadata
              enrichedBookData = {
                ...enrichedBookData,
                title: bookDetails.title || request.title,
                author: bookDetails.author || request.author,
                isbn: bookDetails.isbn || request.isbn,
                // Add additional metadata
                authorMetadata: authorInfo ? {
                  name: authorInfo.name,
                  books: authorInfo.books?.length || 0,
                  genres: authorInfo.primaryGenres || []
                } : null,
                bookMetadata: {
                  title: bookDetails.title || request.title,
                  source: request.source,
                  sourceId: request.bookId,
                  publishYear: bookDetails.year
                }
              };
              
              log(`Enhanced book data: ${JSON.stringify(enrichedBookData)}`);
            }
          } catch (metadataError) {
            log(`Error getting enhanced metadata: ${metadataError.message}`);
            // Continue with basic metadata if enhanced fails
          }
        }

        // Use the readarrAPI module's functions to add the book
        const readarrResult = await readarrAPI.addBook(enrichedBookData);
        
        // Update request with readarr info
        request.readarrStatus = 'added';
        request.readarrId = readarrResult.id?.toString() || '';
        request.readarrMessage = 'Successfully added to Readarr';

      } catch (error) {
        console.error('Error adding book to Readarr:', error);
        log(`ERROR in Readarr flow: ${error.message}`);

        // Still update the request status, but note the error
        request.readarrStatus = 'error';
        request.readarrMessage = error.message || 'Error adding to Readarr';
      }
    }

    request.status = status;
    await request.save();

    // Send notification to user about status change
    try {
      if (previousStatus !== status) {
        // Get user details
        const userData = await Request.findById(id)
          .populate('user', 'username email');
        
        // Notification title and message based on new status
        let notificationTitle = 'Book Request Update';
        let notificationBody = '';
        
        switch (status) {
          case 'approved':
            notificationTitle = 'Book Request Approved';
            notificationBody = `Your request for "${request.title}" has been approved and added to the download queue.`;
            break;
          case 'denied':
            notificationTitle = 'Book Request Denied';
            notificationBody = `Your request for "${request.title}" has been denied.`;
            break;
          case 'available':
            notificationTitle = 'Book Now Available';
            notificationBody = `"${request.title}" is now available in the library.`;
            break;
          default:
            notificationBody = `The status of your request for "${request.title}" has been updated to ${status}.`;
        }
        
        const userNotification = {
          title: notificationTitle,
          body: notificationBody,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: {
            url: '/requests',
            requestId: id,
            bookId: request.bookId,
            type: 'request-status-update'
          }
        };
        
        await notificationService.sendUserNotification(
          userData.user._id, 
          userNotification
        );
        
        log(`User notification sent for status change to ${status} for request: "${request.title}"`);
      }
    } catch (notifyError) {
      // Don't fail if notification fails
      log(`Failed to send status update notification: ${notifyError.message}`);
    }

    res.json(request);
  } catch (err) {
    console.error('Error updating request status:', err);
    res.status(500).send('Server error');
  }
};

exports.getUserRequests = async (req, res) => {
  try {
    const requests = await Request.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    // Only admin can view all requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const requests = await Request.find()
      .populate('user', 'username email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Enhanced version to also check/update metadata
exports.checkRequestsStatus = async (req, res) => {
  try {
    // Only admin can run this check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get approved requests with readarrId that aren't marked as 'downloaded'
    const requests = await Request.find({
      status: 'approved',
      readarrId: { $exists: true, $ne: '' },
      readarrStatus: { $ne: 'downloaded' }
    }).populate('user', 'username');

    if (requests.length === 0) {
      return res.json({ message: 'No requests to check', updatedCount: 0 });
    }

    log(`Checking status for ${requests.length} requests`);

    // Check each request
    let updatedCount = 0;
    let metadataUpdatedCount = 0;
    let metadataFailedCount = 0;

    for (const request of requests) {
      try {
        // Check if the book is available in Readarr
        const bookStatus = await readarrAPI.getBookStatus(request.readarrId);
        log(`Request ${request._id}: Book ${request.readarrId} status - isDownloaded: ${bookStatus.isDownloaded}`);

        if (bookStatus.isDownloaded) {
          // Update metadata if file path is available
          if (bookStatus.bookFilePath) {
            try {
              log(`Updating metadata for book: ${request.title} (file: ${bookStatus.bookFilePath})`);
              
              await calibreAPI.updateBookMetadata(bookStatus.bookFilePath, {
                user: request.user.username,
                userId: request.user._id.toString()
              });
              
              log(`Metadata updated for book: ${request.title}`);
              metadataUpdatedCount++;
              
              // Update the request status
              request.readarrStatus = 'downloaded';
              request.status = 'available';
              request.readarrMessage = 'Book is downloaded and available with metadata';
              await request.save();
              updatedCount++;
              
              // Send notification to user that book is available
              try {
                const userNotification = {
                  title: 'Book Now Available',
                  body: `Your requested book "${request.title}" is now available in the library.`,
                  icon: '/icon-192x192.png',
                  badge: '/badge-72x72.png',
                  data: {
                    url: '/requests',
                    requestId: request._id.toString(),
                    type: 'book-available'
                  }
                };
                
                await notificationService.sendUserNotification(
                  request.user._id, 
                  userNotification
                );
                log(`Notification sent to user for book availability: ${request.title}`);
              } catch (notifyError) {
                log(`Failed to send book availability notification: ${notifyError.message}`);
              }
            } catch (metadataError) {
              log(`Error updating metadata: ${metadataError.message}`);
              metadataFailedCount++;
              
              // Still update request status but note the error
              request.readarrStatus = 'downloaded';
              request.status = 'available';
              request.readarrMessage = `Book is downloaded but metadata update failed: ${metadataError.message}`;
              await request.save();
              updatedCount++;
            }
          } else {
            // No file path, but still update status
            log(`No file path available for book: ${request.title}`);
            request.readarrStatus = 'downloaded';
            request.status = 'available';
            request.readarrMessage = 'Book is downloaded and available (no file path for metadata)';
            await request.save();
            updatedCount++;
          }
        }
      } catch (error) {
        log(`Error checking status for request ${request._id}: ${error.message}`);
      }
    }

    res.json({ 
      message: `Checked ${requests.length} requests, updated ${updatedCount}`,
      updatedCount,
      metadataStats: {
        updated: metadataUpdatedCount,
        failed: metadataFailedCount
      }
    });
  } catch (err) {
    log(`Error checking requests status: ${err.message}`);
    res.status(500).send('Server error');
  }
};

// Manual metadata update for a specific request
exports.updateRequestMetadata = async (req, res) => {
  try {
    // Only admin can update metadata
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    const request = await Request.findById(id).populate('user', 'username');
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if the request has a Readarr ID
    if (!request.readarrId) {
      return res.status(400).json({ message: 'Request does not have a Readarr ID' });
    }

    // Get book status from Readarr
    const bookStatus = await readarrAPI.getBookStatus(request.readarrId);
    
    if (!bookStatus.isDownloaded) {
      return res.status(400).json({ message: 'Book is not downloaded yet' });
    }

    if (!bookStatus.bookFilePath) {
      return res.status(400).json({ message: 'No file path available for the book' });
    }

    // Update metadata
    await calibreAPI.updateBookMetadata(bookStatus.bookFilePath, {
      user: request.user.username,
      userId: request.user._id.toString()
    });

    // Update request status
    request.readarrStatus = 'downloaded';
    request.status = 'available';
    request.readarrMessage = 'Book is downloaded and metadata updated manually';
    await request.save();

    res.json({
      message: 'Metadata updated successfully',
      request
    });
  } catch (err) {
    log(`Error updating metadata: ${err.message}`);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};