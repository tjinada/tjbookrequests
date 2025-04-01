// controllers/adminUserController.js
const User = require('../models/User');
const Request = require('../models/Request');

// Get all users
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

    // Delete the user
    await User.findByIdAndDelete(id);

    res.json({ message: 'User and associated requests successfully deleted' });
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

    res.json({
      totalUsers,
      adminUsers,
      newUsers,
      activeUsers
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
};