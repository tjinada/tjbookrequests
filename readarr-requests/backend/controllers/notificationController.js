// controllers/notificationController.js
const notificationService = require('../services/notificationService');

/**
 * Subscribe to push notifications
 */
exports.subscribe = async (req, res) => {
  try {
    // Get the push subscription object from the request
    const subscription = req.body.subscription;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: 'Invalid subscription object' });
    }

    // Save the subscription to the user's document
    const result = await notificationService.saveSubscription(req.user.id, subscription);
    
    res.status(201).json({ 
      success: true, 
      message: 'Subscription saved successfully' 
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save subscription'
    });
  }
};

/**
 * Unsubscribe from push notifications
 */
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required' });
    }

    // Remove the subscription
    const result = await notificationService.removeSubscription(req.user.id, endpoint);
    
    res.json({ 
      success: true, 
      message: 'Subscription removed successfully' 
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove subscription'
    });
  }
};

/**
 * Send a test notification to the current user
 */
exports.sendTestNotification = async (req, res) => {
  try {
    const notification = {
      title: 'Test Notification',
      body: 'This is a test notification from Readarr Requests',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        url: '/',
        type: 'test'
      }
    };

    const result = await notificationService.sendUserNotification(req.user.id, notification);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Test notification sent successfully',
        results: result.results
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'No active subscriptions found for this user' 
      });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
};

/**
 * Send a test notification to all admin users (admin only)
 */
exports.sendAdminTestNotification = async (req, res) => {
  try {
    // Verify admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const notification = {
      title: 'Admin Test Notification',
      body: 'This is a test notification for admins',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        url: '/admin/requests',
        type: 'admin-test'
      }
    };

    const result = await notificationService.sendAdminNotification(notification);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Admin test notification sent successfully',
        results: result.results
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'No active admin subscriptions found' 
      });
    }
  } catch (error) {
    console.error('Admin test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send admin test notification'
    });
  }
};

/**
 * Get VAPID public key for push subscription
 */
exports.getVapidPublicKey = async (req, res) => {
  try {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!vapidPublicKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'VAPID public key not configured on server' 
      });
    }
    
    res.json({ 
      success: true, 
      vapidPublicKey 
    });
  } catch (error) {
    console.error('Get VAPID key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VAPID public key'
    });
  }
};