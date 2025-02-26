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
        const readarrResult = await readarrAPI.addBook({
          title: request.title,
          author: request.author,
          isbn: request.isbn
        });
    
        // Add information about the readarr result to the request
        request.readarrStatus = 'success';
        request.readarrId = readarrResult.id || '';
        request.readarrMessage = 'Successfully added to Readarr';
    
        // Even if the book was added successfully, the actual download might happen later
        // So we'll let the user know this
        log(`Book "${request.title}" successfully added to Readarr and search initiated`);
      } catch (error) {
        console.error('Error adding book to Readarr:', error);
    
        // Still update the request status, but note the error
        request.readarrStatus = 'error';
        request.readarrMessage = error.message || 'Error adding to Readarr';
    
        // If it's just the search that failed, note that the book was still added
        if (error.message && error.message.includes('search') && !error.message.includes('add')) {
          request.readarrStatus = 'partial_success';
          request.readarrMessage = 'Book added to Readarr, but automatic search failed. A search may happen on the next Readarr scan.';
        }
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