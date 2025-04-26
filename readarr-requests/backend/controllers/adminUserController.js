// controllers/adminUserController.js
const User = require('../models/User');
const Request = require('../models/Request');
const UserActivity = require('../models/UserActivity');
const mongoose = require('mongoose');

// Get all users with last seen information
exports.getAllUsers = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Fetch all users and sort by creation date (newest first)
    const users = await User.find()
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Find the user to be deleted
    const userToDelete = await User.findById(id);

    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deletion of admin users (optional safety feature)
    if (userToDelete.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin users' });
    }

    // Delete all requests from this user
    await Request.deleteMany({ user: id });
    
    // Delete all user activities
    await UserActivity.deleteMany({ user: id });

    // Delete the user
    await User.findByIdAndDelete(id);

    res.json({ message: 'User and associated data successfully deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Get total count of users
    const totalUsers = await User.countDocuments();
    
    // Get total count of admins
    const adminUsers = await User.countDocuments({ role: 'admin' });
    
    // Get count of users registered in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    // Get count of active users (users with at least one request)
    const activeUsers = await Request.distinct('user').then(users => users.length);
    
    // Get count of users active in last 7 days (based on lastSeen)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyActiveUsers = await User.countDocuments({ lastSeen: { $gte: sevenDaysAgo } });

    res.json({
      totalUsers,
      adminUsers,
      newUsers,
      activeUsers,
      recentlyActiveUsers
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user activity metrics
exports.getUserActivityMetrics = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Get activity counts by type
    const activityCounts = await UserActivity.aggregate([
      { $group: { _id: '$activity', count: { $sum: 1 } } }
    ]);

    // Format into a more user-friendly object
    const activityMetrics = {};
    activityCounts.forEach(item => {
      activityMetrics[item._id] = item.count;
    });

    // Get most active users (top 10)
    const mostActiveUsers = await UserActivity.aggregate([
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get user details for the most active users
    const userIds = mostActiveUsers.map(item => mongoose.Types.ObjectId(item._id));
    const userDetails = await User.find({ _id: { $in: userIds } })
      .select('username email');

    // Combine user details with activity counts
    const topUsers = mostActiveUsers.map(item => {
      const user = userDetails.find(u => u._id.toString() === item._id.toString());
      return {
        userId: item._id,
        username: user ? user.username : 'Unknown',
        email: user ? user.email : 'Unknown',
        activityCount: item.count
      };
    });

    res.json({
      activityMetrics,
      topUsers
    });
  } catch (err) {
    console.error('Error fetching user activity metrics:', err);
    res.status(500).json({ message: 'Server error' });
  }
};