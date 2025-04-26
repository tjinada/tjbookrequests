// routes/reader.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const UserActivity = require('../models/UserActivity');
const User = require('../models/User');

// @route   POST api/reader/:bookId/track
// @desc    Track reading activity (simplified)
// @access  Private
router.post('/:bookId/track', auth, async (req, res) => {
  try {
    const { bookId } = req.params;
    
    // Create activity record
    const readingActivity = new UserActivity({
      user: req.user.id,
      activity: 'reading',
      details: {
        bookId,
        timestamp: new Date()
      }
    });
    
    await readingActivity.save();
    
    // Update user's last seen timestamp
    await User.findByIdAndUpdate(req.user.id, { lastSeen: new Date() });
    
    res.status(200).json({ message: 'Reading activity tracked' });
  } catch (err) {
    console.error('Error tracking reading activity:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;