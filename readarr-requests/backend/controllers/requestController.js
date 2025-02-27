// controllers/requestController.js
const Request = require('../models/Request');
const readarrAPI = require('../config/readarr');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/readarr.log');
fs.mkdirSync(path.dirname(logFile), { recursive: true });

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
        const readarrAPI = require('../config/readarr');
        const tags = [];
        if (request.user && request.user.username) {
          tags.push(`${request.user.username}`);
        }
        tags.push('user-requested');
        const readarrResult = await readarrAPI.addBook({
          title: request.title,
          author: request.author,
          isbn: request.isbn
        },
        tags );

        // Add information about the readarr result to the request
        request.readarrStatus = 'added';
        request.readarrId = readarrResult.id?.toString() || '';
        request.readarrMessage = 'Successfully added to Readarr';
        request.readarrTags = tags;

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
// Other controller methods remain the same
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

// controllers/requestController.js
// Add this new function
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
    });

    if (requests.length === 0) {
      return res.json({ message: 'No requests to check', updatedCount: 0 });
    }

    // Check each request
    const readarrAPI = require('../config/readarr');
    let updatedCount = 0;

    for (const request of requests) {
      try {
        // Check if the book is available in Readarr
        const bookStatus = await readarrAPI.getBookStatus(request.readarrId);

        if (bookStatus.isDownloaded) {
          // Update the request status
          request.readarrStatus = 'downloaded';
          request.status = 'available';
          request.readarrMessage = 'Book is downloaded and available';
          await request.save();
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error checking status for request ${request._id}:`, error);
      }
    }

    res.json({ 
      message: `Checked ${requests.length} requests, updated ${updatedCount}`,
      updatedCount
    });
  } catch (err) {
    console.error('Error checking requests status:', err);
    res.status(500).send('Server error');
  }
};

exports.updateRequestTags = async (req, res) => {
  try {
    // Only admin can update tags
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ message: 'Tags must be an array' });
    }

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Update tags in the database
    request.readarrTags = tags;
    await request.save();

    // Also update tags in Readarr if we have a readarrId
    if (request.readarrId) {
      try {
        const readarrAPI = require('../config/readarr');

        // Convert tag names to Readarr tag IDs
        const tagIds = [];
        for (const tagName of tags) {
          const tagId = await readarrAPI.getOrCreateTag(tagName);
          if (tagId) {
            tagIds.push(tagId);
          }
        }

        // Update the book's tags in Readarr
        await readarrAPI.updateBookTags(request.readarrId, tagIds);
      } catch (error) {
        console.error('Error updating tags in Readarr:', error);
        // Continue anyway - database update is more important
      }
    }

    res.json({ message: 'Tags updated successfully', tags: request.readarrTags });
  } catch (err) {
    console.error('Error updating request tags:', err);
    res.status(500).send('Server error');
  }
};