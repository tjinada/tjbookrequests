// controllers/userActivityController.js
const UserActivity = require('../models/UserActivity');
const User = require('../models/User');

// Track user activity
exports.trackActivity = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Update last seen timestamp for the user
    await User.findByIdAndUpdate(req.user.id, { lastSeen: new Date() });

    // If activity tracking is not required for this route, just continue
    if (!req.activityToTrack) {
      return next();
    }

    // Create new activity record
    const newActivity = new UserActivity({
      user: req.user.id,
      activity: req.activityToTrack,
      details: req.activityDetails || {}
    });

    // Save the activity asynchronously (don't block the response)
    newActivity.save().catch(err => {
      console.error('Error recording user activity:', err);
    });

    // Continue with the request
    next();
  } catch (err) {
    console.error('Error in activity tracking middleware:', err);
    next(); // Continue even if tracking fails
  }
};

// Get activities for a specific user
exports.getUserActivities = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { userId } = req.params;
    const { limit = 50 } = req.query;

    // Find the requested user to ensure they exist
    const user = await User.findById(userId).select('username email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user activities
    const activities = await UserActivity.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      user,
      activities
    });
  } catch (err) {
    console.error('Error fetching user activities:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user activity summary
exports.getUserActivitySummary = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { userId } = req.params;

    // Find the requested user to ensure they exist
    const user = await User.findById(userId).select('username email lastSeen');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get counts of different activities
    const activityCounts = await UserActivity.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$activity', count: { $sum: 1 } } }
    ]);

    // Get the latest activity
    const latestActivity = await UserActivity.findOne({ user: userId })
      .sort({ timestamp: -1 })
      .limit(1);

    // Organize the counts into an object
    const summary = {
      search: 0,
      login: 0,
      view_book: 0,
      request_book: 0,
      reading: 0
    };

    activityCounts.forEach(item => {
      summary[item._id] = item.count;
    });

    res.json({
      user,
      summary,
      latestActivity: latestActivity || null
    });
  } catch (err) {
    console.error('Error fetching user activity summary:', err);
    res.status(500).json({ message: 'Server error' });
  }
};