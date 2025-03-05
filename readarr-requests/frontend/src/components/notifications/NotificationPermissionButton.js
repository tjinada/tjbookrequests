// src/components/notifications/NotificationPermissionButton.js
import React, { useState, useEffect, useContext } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import AuthContext from '../../context/AuthContext';
import api from '../../utils/api';

const NotificationPermissionButton = ({ variant = "contained", color = "primary", size = "medium" }) => {
  const [permissionState, setPermissionState] = useState('default');
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const { user } = useContext(AuthContext);

  // Check if notifications are supported
  useEffect(() => {
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }
    
    setPermissionState(Notification.permission);
    
    // Check if this might be iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      // On iOS, we also need to check if we're in standalone mode (added to home screen)
      if (!window.navigator.standalone) {
        setMessage('For notifications on iOS, add this app to your home screen first');
      }
    }
  }, []);

  // Function to get the VAPID public key from the server
  const getVapidPublicKey = async () => {
    try {
      const response = await api.get('/notifications/vapid-public-key');
      return response.data.vapidPublicKey;
    } catch (error) {
      console.error('Error getting VAPID key:', error);
      throw error;
    }
  };

  // Function to save subscription to the server
  const saveSubscription = async (subscription) => {
    try {
      console.log('Saving subscription to server:', subscription);
      const response = await api.post('/notifications/subscribe', { subscription });
      console.log('Subscription saved successfully:', response.data);
      return true;
    } catch (error) {
      console.error('Failed to save subscription:', error);
      setMessage(`Error saving subscription: ${error.response?.data?.message || error.message}`);
      setSnackbarOpen(true);
      return false;
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setMessage('Notifications are not supported in this browser');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    try {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('Permission response:', permission);
      
      setPermissionState(permission);
      
      if (permission === 'granted') {
        // Register service worker if not already registered
        if ('serviceWorker' in navigator) {
          try {
            let registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
              registration = await navigator.serviceWorker.register('/service-worker.js');
              console.log('Service Worker registered:', registration);
            }
            
            // Wait for the service worker to be active
            await navigator.serviceWorker.ready;
            
            // Get VAPID public key from your server
            const vapidPublicKey = await getVapidPublicKey();
            
            if (!vapidPublicKey) {
              throw new Error('Failed to get VAPID public key');
            }
            
            // Convert VAPID key to Uint8Array for the subscription
            function urlBase64ToUint8Array(base64String) {
              const padding = '='.repeat((4 - base64String.length % 4) % 4);
              const base64 = (base64String + padding)
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            
              const rawData = window.atob(base64);
              const outputArray = new Uint8Array(rawData.length);
            
              for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
              }
              return outputArray;
            }
            
            // Get existing subscription or create a new one
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
              console.log('Creating new push subscription...');
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
              });
              console.log('New subscription created:', subscription);
            } else {
              console.log('Using existing subscription:', subscription);
            }
            
            // Save the subscription to the server
            const saved = await saveSubscription(subscription);
            
            if (saved) {
              setMessage('Notifications enabled and subscription saved!');
              
              // Send a test notification using your test endpoint
              try {
                await api.post('/notifications/test');
                console.log('Test notification sent');
              } catch (testError) {
                console.error('Error sending test notification:', testError);
              }
            } else {
              setMessage('Notifications enabled but subscription could not be saved.');
            }
          } catch (error) {
            console.error('Service Worker or subscription error:', error);
            setMessage(`Error: ${error.message}`);
          }
        } else {
          setMessage('Service Workers are not supported in this browser');
        }
      } else if (permission === 'denied') {
        setMessage('Notification permission denied. Please enable notifications in your browser settings.');
      } else {
        setMessage('Notification permission was dismissed');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setSnackbarOpen(true);
    }
  };

  // Get button content based on permission state
  const getButtonContent = () => {
    if (loading) {
      return <CircularProgress size={24} color="inherit" />;
    }
    
    switch (permissionState) {
      case 'granted':
        return (
          <>
            <NotificationsActiveIcon sx={{ mr: 1 }} />
            Notifications Enabled
          </>
        );
      case 'denied':
        return (
          <>
            <NotificationsOffIcon sx={{ mr: 1 }} />
            Enable Notifications
          </>
        );
      default:
        return (
          <>
            <NotificationsIcon sx={{ mr: 1 }} />
            Enable Notifications
          </>
        );
    }
  };

  if (!isSupported) {
    return (
      <Tooltip title="Notifications are not supported in this browser">
        <span>
          <Button 
            variant={variant}
            color="error"
            size={size}
            disabled
            startIcon={<NotificationsOffIcon />}
          >
            Not Supported
          </Button>
        </span>
      </Tooltip>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        color={permissionState === 'granted' ? 'success' : color}
        size={size}
        onClick={requestPermission}
        disabled={loading || permissionState === 'denied'}
        startIcon={permissionState === 'granted' ? <NotificationsActiveIcon /> : <NotificationsIcon />}
      >
        {getButtonContent()}
      </Button>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={permissionState === 'granted' ? 'success' : 'info'}
        >
          {message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationPermissionButton;