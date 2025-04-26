// controllers/requestController.js
const User = require('../models/User');

const Request = require('../models/Request');
const readarrAPI = require('../config/readarr');
const calibreAPI = require('../config/calibreAPI');
const googleBooksAPI = require('../config/googleBooks');
const openLibraryAPI = require('../config/openLibrary');
const notificationService = require('../services/notificationService');
const { findBestBookMatch } = require('../utils/bookMatching');
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
    
    // Check if book already exists in Calibre and user already has access
    const existingBook = await checkBookInCalibre(title, author);
    
    if (existingBook) {
      log(`Book already exists in Calibre with ID: ${existingBook.id}`);
      
      // Check if user already has access to this book
      const user = await User.findById(req.user.id).select('username');
      if (user && user.username && existingBook.tags && existingBook.tags.includes(user.username)) {
        return res.status(400).json({ message: 'You already have access to this book in your library' });
      }
      
      // If user doesn't have access, create the request which admin can approve
      log(`User ${user.username} requesting existing book in Calibre`);
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

    // If admin auto-approval is enabled and book exists in Calibre, 
    // mark as available immediately (optional feature)
    if (process.env.AUTO_APPROVE_EXISTING_BOOKS === 'true' && existingBook) {
      try {
        // Get user details
        const user = await User.findById(req.user.id).select('username');
        
        if (user && user.username) {
          // Update Calibre tags to include user
          const currentTags = existingBook.tags || [];
          const updatedTags = [...currentTags, user.username];
          
          await calibreAPI.updateBookTags(existingBook.id, updatedTags);
          log(`Auto-approved: Added user ${user.username} tag to existing book ID: ${existingBook.id}`);
          
          // Set request as available
          newRequest.status = 'available';
          newRequest.readarrStatus = 'downloaded';
          newRequest.readarrMessage = 'Book already exists in library, automatically approved';
        }
      } catch (error) {
        log(`Error auto-approving existing book: ${error.message}`);
        // Continue with normal request creation if auto-approval fails
      }
    }

    // Save the request
    await newRequest.save();
    
    // Track the request activity
    try {
      const UserActivity = require('../models/UserActivity');
      const requestActivity = new UserActivity({
        user: req.user.id,
        activity: 'request_book',
        details: {
          requestId: newRequest._id,
          bookId,
          title,
          author,
          timestamp: new Date()
        }
      });
      await requestActivity.save();
      
      // Update user's last seen timestamp
      await User.findByIdAndUpdate(req.user.id, { lastSeen: new Date() });
    } catch (activityError) {
      console.error('Error tracking request activity:', activityError);
      // Don't fail the request if activity tracking fails
    }
    
    // Get user information for the notification
    const userInfo = await User.findById(req.user.id).select('username');
    
    // Send notification to admins about the new request
    try {
      const adminNotification = {
        title: 'New Book Request',
        body: `${userInfo.username} requested "${title}" by ${author}`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
          url: '/admin/requests',
          bookId: bookId,
          requestId: newRequest._id.toString(),
          type: 'new-request'
        },
        actions: [
          {
            action: 'view-requests',
            title: 'View Requests'
          }
        ]
      };
      
      // Send notification to all admins
      await notificationService.sendAdminNotification(adminNotification);
      log(`Admin notification sent for new book request: "${title}" by ${author}`);
    } catch (notifyError) {
      // Don't fail if notification fails
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

    // If approving the request, check if book exists in Calibre first
    if (status === 'approved' && request.status !== 'approved') {
      try {
        log(`Processing request approval for: "${request.title}" by ${request.author}`);
        
        // First check if the book already exists in Calibre
        const existingBook = await checkBookInCalibre(request.title, request.author);
        
        if (existingBook) {
          log(`Book already exists in Calibre with ID: ${existingBook.id}`);
          
          // Update the Calibre book tags to include the requesting user's username
          const user = await User.findById(request.user).select('username');
          if (user && user.username) {
            // Get current tags
            const currentTags = existingBook.tags || [];
            
            // Add user's username if not already present
            if (!currentTags.includes(user.username)) {
              const updatedTags = [...currentTags, user.username];
              
              try {
                // Update tags in Calibre
                await calibreAPI.updateBookTags(existingBook.id, updatedTags);
                log(`Added user ${user.username} tag to existing book ID: ${existingBook.id}`);
                
                // Update request to available status immediately
                request.status = 'available';
                request.readarrStatus = 'downloaded'; // Use 'downloaded' instead of 'externally-downloaded'
                request.readarrMessage = 'Book already exists in library, user granted access';
                await request.save();
                
                // Send notification about book availability
                try {
                  await notificationService.sendBookAvailableNotification(
                    {
                      id: existingBook.id,
                      title: request.title,
                      author: request.author
                    },
                    request
                  );
                  log(`Notification sent to user for existing book availability: ${request.title}`);
                } catch (notifyError) {
                  log(`Error sending notification: ${notifyError.message}`);
                }
                
                // Return updated request to client to avoid proceeding with Readarr
                return res.json(request);
              } catch (tagError) {
                log(`Error updating Calibre tags: ${tagError.message}`);
                // Continue with normal Readarr flow if tag update fails
              }
            } else {
              // User already has access to this book
              log(`User ${user.username} already has access to this book`);
              
              // Update request status directly
              request.status = 'available';
              request.readarrStatus = 'downloaded'; // Use 'downloaded' instead of 'externally-downloaded'
              request.readarrMessage = 'User already has access to this book in library';
              await request.save();
              
              // Return updated request to avoid proceeding with Readarr
              return res.json(request);
            }
          }
        } else {
          log('Book not found in Calibre, proceeding with Readarr search');
        }
        
        // Rest of original code for Readarr search and processing
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
              // Enhanced book data with metadata
              // ... [rest of the original code]
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
        const user = await User.findById(request.user).select('username');
        
        // Only send notifications for status changes that are important to users
        if (status === 'approved' || status === 'denied' || status === 'available') {
          let statusMessage = '';
          let notificationType = '';
          
          switch(status) {
            case 'approved':
              statusMessage = 'has been approved and will be downloaded soon';
              notificationType = 'request-approved';
              break;
            case 'denied':
              statusMessage = 'has been denied by an administrator';
              notificationType = 'request-denied';
              break;
            case 'available':
              statusMessage = 'is now available in the library';
              notificationType = 'book-available';
              break;
          }
          
          const userNotification = {
            title: 'Book Request Update',
            body: `Your request for "${request.title}" ${statusMessage}`,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            data: {
              url: '/requests',
              requestId: request._id.toString(),
              type: notificationType
            }
          };
          
          await notificationService.sendUserNotification(request.user, userNotification);
          log(`User notification sent for request status change: ${request.title} -> ${status}`);
        }
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

// Reset Readarr status to try again
exports.resetReadarrStatus = async (req, res) => {
  try {
    // Only admin can update request status
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    const { readarrStatus, readarrMessage } = req.body;

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Update Readarr status
    request.readarrStatus = readarrStatus || 'pending';
    request.readarrMessage = readarrMessage || 'Status reset by admin';
    
    // If there was an error, clear it to try again
    if (request.readarrStatus === 'pending') {
      // Optionally, you can reset readarrId if needed, but keeping it might be useful
      // request.readarrId = '';
    }

    await request.save();
    res.json(request);
  } catch (err) {
    console.error('Error resetting Readarr status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Mark book as externally downloaded
exports.markExternallyDownloaded = async (req, res) => {
  try {
    // Only admin can update request status
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    const { notes } = req.body;

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Update request status
    request.status = 'available';
    request.readarrStatus = 'externally-downloaded';
    request.readarrMessage = notes || 'Book obtained externally and marked as available by admin';

    await request.save();

    // Send notification to user about book availability
    try {
      // Get user details
      const userData = await Request.findById(id)
        .populate('user', 'username email');
      
      // Notify user about book availability
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
        userData.user._id, 
        userNotification
      );
      
      log(`Book marked as available: ${request.title} for user ${userData.user.username}`);
    } catch (notifyError) {
      log(`Failed to send book availability notification: ${notifyError.message}`);
    }

    res.json(request);
  } catch (err) {
    console.error('Error marking as externally downloaded:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.calibreBatchMatch = async (req, res) => {
  try {
    // Only admin can run this check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    log('Starting batch matching of requests to Calibre library');

    // Get all pending requests
    const pendingRequests = await Request.find({
      status: 'pending'
    }).populate('user', 'username');

    if (pendingRequests.length === 0) {
      return res.json({ 
        message: 'No pending requests to check',
        totalChecked: 0,
        matchedCount: 0,
        approvedCount: 0
      });
    }

    log(`Found ${pendingRequests.length} pending requests to check against Calibre`);

    // Get all books from Calibre once (optimization)
    const calibreBooks = await calibreAPI.searchBooks('*');
    
    log(`Fetched ${calibreBooks.length} books from Calibre for matching`);

    // Get match threshold from environment or use default (0.8)
    const threshold = parseFloat(process.env.CALIBRE_MATCH_THRESHOLD) || 0.8;
    const autoApprove = process.env.AUTO_APPROVE_EXISTING_BOOKS === 'true';

    // Results tracking
    let matchedCount = 0;
    let approvedCount = 0;

    // Check each request against Calibre
    for (const request of pendingRequests) {
      try {
        // Use our utility function to find the best match
        const bestMatch = findBestBookMatch(
          { title: request.title, author: request.author },
          calibreBooks,
          threshold
        );

        if (bestMatch) {
          log(`Match found for request ${request._id}: Book "${request.title}" matches Calibre ID ${bestMatch.id}`);
          matchedCount++;

          // If auto-approve is enabled, update the book tags and request status
          if (autoApprove && request.user && request.user.username) {
            try {
              // Get current tags
              const currentTags = bestMatch.tags || [];
              
              // Add user's username if not already present
              if (!currentTags.includes(request.user.username)) {
                const updatedTags = [...currentTags, request.user.username];
                
                // Update tags in Calibre
                await calibreAPI.updateBookTags(bestMatch.id, updatedTags);
                log(`Added user ${request.user.username} tag to existing book ID: ${bestMatch.id}`);
                
                // Update request to available status
                request.status = 'available';
                request.readarrStatus = 'downloaded';
                request.readarrMessage = 'Book already exists in library, user granted access';
                await request.save();
                
                approvedCount++;
                
                // Send notification about book availability
                try {
                  await notificationService.sendBookAvailableNotification(
                    {
                      id: bestMatch.id,
                      title: request.title,
                      author: request.author
                    },
                    request
                  );
                  log(`Notification sent to user for existing book availability: ${request.title}`);
                } catch (notifyError) {
                  log(`Error sending notification: ${notifyError.message}`);
                }
              } else {
                log(`User ${request.user.username} already has tag on book ${bestMatch.id}`);
              }
            } catch (error) {
              log(`Error auto-approving book: ${error.message}`);
            }
          }
        }
      } catch (reqError) {
        log(`Error processing request ${request._id}: ${reqError.message}`);
      }
    }

    res.json({
      message: `Found ${matchedCount} matching books in Calibre library, auto-approved ${approvedCount}`,
      totalChecked: pendingRequests.length,
      matchedCount,
      approvedCount
    });
  } catch (err) {
    log(`Error in Calibre batch matching: ${err.message}`);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

async function checkBookInCalibre(bookTitle, bookAuthor, isbn) {
  try {
    log(`Checking if book exists in Calibre - Title: "${bookTitle}", Author: "${bookAuthor}"`);
    
    // First, check if we can find by ISBN if provided
    if (isbn) {
      log(`Attempting to match by ISBN: ${isbn}`);
      try {
        // Many Calibre libraries use a custom column for ISBN
        // You might need to adjust this search query based on your Calibre setup
        const isbnBooks = await calibreAPI.searchBooks(`isbn:${isbn}`);
        if (isbnBooks && isbnBooks.length > 0) {
          log(`Found book matching ISBN: ${isbn}`);
          return isbnBooks[0];
        }
      } catch (isbnErr) {
        log(`Error searching by ISBN: ${isbnErr.message}`);
        // Continue with title/author search if ISBN search fails
      }
    }
    
    // Search Calibre for all books
    const calibreBooks = await calibreAPI.searchBooks('*');
    
    // If no books in Calibre, return null
    if (!calibreBooks || calibreBooks.length === 0) {
      return null;
    }
    
    // Get match threshold from environment or use default (0.8)
    const threshold = parseFloat(process.env.CALIBRE_MATCH_THRESHOLD) || 0.8;
    
    // Use our utility function to find the best match
    const bestMatch = findBestBookMatch(
      { title: bookTitle, author: bookAuthor },
      calibreBooks,
      threshold
    );
    
    if (bestMatch) {
      log(`Found matching book in Calibre: "${bestMatch.title}" by ${bestMatch.author} (ID: ${bestMatch.id})`);
    } else {
      log(`No matching book found in Calibre for "${bookTitle}" by ${bookAuthor}`);
    }
    
    return bestMatch;
  } catch (error) {
    log(`Error checking book in Calibre: ${error.message}`);
    return null;
  }
}