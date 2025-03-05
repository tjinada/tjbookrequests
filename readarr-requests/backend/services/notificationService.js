// services/notificationService.js
const User = require('../models/User');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/notifications.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || 'admin@example.com'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Save a user subscription for push notifications
 * @param {string} userId - User ID
 * @param {Object} subscription - Push subscription object from browser
 */
exports.saveSubscription = async (userId, subscription) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Initialize pushSubscriptions array if it doesn't exist
    if (!user.pushSubscriptions) {
      user.pushSubscriptions = [];
    }
    
    // Check if subscription already exists
    const existingSubIndex = user.pushSubscriptions.findIndex(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (existingSubIndex > -1) {
      // Update existing subscription
      user.pushSubscriptions[existingSubIndex] = subscription;
    } else {
      // Add new subscription
      user.pushSubscriptions.push(subscription);
    }
    
    await user.save();
    log(`Saved push subscription for user: ${userId}`);
    return { success: true };
  } catch (error) {
    log(`Error saving push subscription: ${error.message}`);
    throw error;
  }
};

/**
 * Remove a user subscription
 * @param {string} userId - User ID
 * @param {string} endpoint - Subscription endpoint to remove
 */
exports.removeSubscription = async (userId, endpoint) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions) {
      return { success: false, message: 'User or subscriptions not found' };
    }
    
    // Filter out the subscription with the matching endpoint
    user.pushSubscriptions = user.pushSubscriptions.filter(
      sub => sub.endpoint !== endpoint
    );
    
    await user.save();
    log(`Removed push subscription for user: ${userId}`);
    return { success: true };
  } catch (error) {
    log(`Error removing push subscription: ${error.message}`);
    throw error;
  }
};

/**
 * Send notification to a specific user
 * @param {string} userId - User ID to notify
 * @param {Object} notification - Notification payload
 */
exports.sendUserNotification = async (userId, notification) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      log(`No subscriptions found for user: ${userId}`);
      return { success: false, message: 'No subscriptions found' };
    }
    
    const results = {
      successful: 0,
      failed: 0
    };
    
    // Send to all user subscriptions
    for (const subscription of user.pushSubscriptions) {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify(notification)
        );
        results.successful++;
      } catch (error) {
        results.failed++;
        log(`Error sending notification to subscription: ${error.message}`);
        
        // Check if subscription is no longer valid (gone)
        if (error.statusCode === 410) {
          // Remove invalid subscription
          log(`Removing invalid subscription for user: ${userId}`);
          user.pushSubscriptions = user.pushSubscriptions.filter(
            sub => sub.endpoint !== subscription.endpoint
          );
        }
      }
    }
    
    // If subscriptions were removed, save the user
    if (results.failed > 0) {
      await user.save();
    }
    
    log(`Sent notification to user ${userId}: Success: ${results.successful}, Failed: ${results.failed}`);
    return { success: results.successful > 0, results };
  } catch (error) {
    log(`Error sending user notification: ${error.message}`);
    throw error;
  }
};

/**
 * Send notification to all admin users
 * @param {Object} notification - Notification payload
 */
exports.sendAdminNotification = async (notification) => {
  try {
    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' });
    
    if (!adminUsers || adminUsers.length === 0) {
      log('No admin users found');
      return { success: false, message: 'No admin users found' };
    }
    
    const results = {
      users: 0,
      successful: 0,
      failed: 0
    };
    
    // Send to each admin user
    for (const admin of adminUsers) {
      if (!admin.pushSubscriptions || admin.pushSubscriptions.length === 0) {
        continue;
      }
      
      results.users++;
      
      // Send to all subscriptions for this admin
      for (const subscription of admin.pushSubscriptions) {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify(notification)
          );
          results.successful++;
        } catch (error) {
          results.failed++;
          log(`Error sending admin notification: ${error.message}`);
          
          // Check if subscription is no longer valid
          if (error.statusCode === 410) {
            // Remove invalid subscription
            admin.pushSubscriptions = admin.pushSubscriptions.filter(
              sub => sub.endpoint !== subscription.endpoint
            );
            await admin.save();
          }
        }
      }
    }
    
    log(`Sent admin notifications: Users: ${results.users}, Success: ${results.successful}, Failed: ${results.failed}`);
    return { success: results.successful > 0, results };
  } catch (error) {
    log(`Error sending admin notifications: ${error.message}`);
    throw error;
  }
};

/**
 * Send a book availability notification
 * @param {Object} book - Book details
 * @param {Object} request - Request details with user information
 */
exports.sendBookAvailableNotification = async (book, request) => {
  try {
    const bookTitle = book.title || 'Requested book';
    
    // Notification payload for user
    const userNotification = {
      title: 'Book Available!',
      body: `Your requested book "${bookTitle}" is now available`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        url: `/book/${book.id}`,
        bookId: book.id,
        requestId: request._id.toString(),
        type: 'book-available'
      },
      actions: [
        {
          action: 'view-book',
          title: 'View Book'
        }
      ]
    };
    
    // Send notification to the user who requested the book
    await exports.sendUserNotification(request.user._id || request.user, userNotification);
    
    // Notification payload for admins
    const adminNotification = {
      title: 'Book Download Complete',
      body: `"${bookTitle}" requested by ${request.user.username || 'a user'} is now available`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        url: '/admin/requests',
        bookId: book.id,
        requestId: request._id.toString(),
        type: 'admin-book-available'
      },
      actions: [
        {
          action: 'view-requests',
          title: 'View Requests'
        }
      ]
    };
    
    // Send notification to all admins
    await exports.sendAdminNotification(adminNotification);
    
    return { success: true };
  } catch (error) {
    log(`Error sending book available notification: ${error.message}`);
    throw error;
  }
};