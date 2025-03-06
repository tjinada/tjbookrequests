// src/components/notifications/NotificationManager.js
import React, { useState, useEffect, useContext } from 'react';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import Typography from '@mui/material/Typography';
import AuthContext from '../../context/AuthContext';
import api from '../../utils/api';

// Convert a base64 string to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const NotificationManager = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [vapidPublicKey, setVapidPublicKey] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);

  // Check if push is supported in the browser
  const isPushSupported = () => {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  };

  // Get VAPID public key from server
  const getVapidKey = async () => {
    try {
      const response = await api.get('/notifications/vapid-public-key');
      if (response.data.success) {
        setVapidPublicKey(response.data.vapidPublicKey);
        return response.data.vapidPublicKey;
      } else {
        setError('Failed to get VAPID key from server');
        return null;
      }
    } catch (err) {
      console.error('Error getting VAPID key:', err);
      setError('Could not connect to notification service');
      return null;
    }
  };

  // Check subscription status
  const checkSubscription = async () => {
    if (!isPushSupported()) {
      setError('Push notifications are not supported in your browser');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setIsSubscribed(subscription !== null);
      setSubscription(subscription);
      return subscription;
    } catch (err) {
      console.error('Error checking subscription:', err);
      setError('Failed to check notification status');
    }
  };

  // Subscribe to push notifications
  const subscribeUser = async () => {
    if (!isPushSupported()) {
      setError('Push notifications are not supported in your browser');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get VAPID key if not already available
      const publicKey = vapidPublicKey || await getVapidKey();
      if (!publicKey) {
        setLoading(false);
        return;
      }

      // Wait for service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to the server
      await saveSubscriptionToServer(subscription);
      
      setIsSubscribed(true);
      setSubscription(subscription);
      setMessage('Notifications enabled successfully!');
      setShowSnackbar(true);
    } catch (err) {
      console.error('Failed to subscribe:', err);
      if (Notification.permission === 'denied') {
        setError('You have blocked notifications. Please enable them in your browser settings.');
      } else {
        setError('Failed to enable notifications: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeUser = async () => {
    if (!subscription) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Unsubscribe from push manager
      await subscription.unsubscribe();
      
      // Send unsubscribe request to server
      await api.post('/notifications/unsubscribe', {
        endpoint: subscription.endpoint
      });
      
      setIsSubscribed(false);
      setSubscription(null);
      setMessage('Notifications disabled');
      setShowSnackbar(true);
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  // Save subscription to server
  const saveSubscriptionToServer = async (subscription) => {
    try {
      await api.post('/notifications/subscribe', {
        subscription: subscription
      });
      return true;
    } catch (err) {
      console.error('Error saving subscription:', err);
      throw new Error('Could not save notification settings');
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (!isSubscribed) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/notifications/test');
      if (response.data.success) {
        setMessage('Test notification sent!');
      } else {
        setError('Could not send test notification');
      }
    } catch (err) {
      console.error('Error sending test notification:', err);
      setError('Failed to send test notification');
    } finally {
      setLoading(false);
      setShowSnackbar(true);
    }
  };

  // Initialize notification status on component mount
  useEffect(() => {
    if (isAuthenticated) {
      // Register service worker if needed
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
            // Check subscription status after service worker is ready
            navigator.serviceWorker.ready.then(() => {
              checkSubscription();
              getVapidKey();
            });
          })
          .catch(error => {
            console.error('Service Worker registration failed:', error);
            setError('Could not set up notification service');
          });
      }
    }
  }, [isAuthenticated]);

  // Handle permission change
  useEffect(() => {
    if (Notification.permission === 'denied') {
      setIsSubscribed(false);
      setError('Notifications are blocked. Please update your browser settings to enable them.');
    }
  }, []);

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  if (!isPushSupported()) {
    return (
      <Alert severity="warning">
        Push notifications are not supported in your browser.
      </Alert>
    );
  }

  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Push Notifications
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        {isSubscribed 
          ? 'You will receive notifications when your requested books become available.' 
          : 'Enable notifications to be alerted when your requested books become available.'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        variant={isSubscribed ? "outlined" : "contained"}
        color={isSubscribed ? "error" : "primary"}
        onClick={isSubscribed ? unsubscribeUser : subscribeUser}
        startIcon={isSubscribed ? <NotificationsOffIcon /> : <NotificationsIcon />}
        disabled={loading}
        sx={{ mr: 2 }}
      >
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          isSubscribed ? 'Disable Notifications' : 'Enable Notifications'
        )}
      </Button>

      {isSubscribed && (
        <Button
          variant="outlined"
          onClick={sendTestNotification}
          disabled={loading}
        >
          Test Notification
        </Button>
      )}

      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={message}
      />
    </div>
  );
};

export default NotificationManager;