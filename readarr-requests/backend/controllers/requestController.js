// controllers/requestController.js
const Request = require('../models/Request');
const readarrAPI = require('../config/readarr');
const calibreAPI = require('../config/calibreAPI');
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

exports.createRequest = async (req, res) => {
  try {
    const { bookId, title, author, cover, isbn } = req.body;

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
      isbn // Add ISBN to help Readarr find the book more accurately
    });

    await newRequest.save();
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

    // If approving the request, add book to Readarr
    if (status === 'approved' && request.status !== 'approved') {
      try {
        const readarrResult = await readarrAPI.addBook({
          title: request.title,
          author: request.author,
          isbn: request.isbn
        });

        // Add information about the readarr result to the request
        request.readarrStatus = 'added';
        request.readarrId = readarrResult.id?.toString() || '';
        request.readarrMessage = 'Successfully added to Readarr';

      } catch (error) {
        console.error('Error adding book to Readarr:', error);

        // Still update the request status, but note the error
        request.readarrStatus = 'error';
        request.readarrMessage = error.message || 'Error adding to Readarr';
      }
    }

    request.status = status;
    await request.save();

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