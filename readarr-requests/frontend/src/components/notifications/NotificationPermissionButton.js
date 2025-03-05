// src/components/notifications/NotificationPermissionButton.js
import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

const NotificationPermissionButton = ({ variant = "contained", color = "primary", size = "medium" }) => {
  const [permissionState, setPermissionState] = useState('default');
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSupported, setIsSupported] = useState(true);

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
        setMessage('Notification permission granted!');
        
        // Register service worker if not already registered
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
              const newRegistration = await navigator.serviceWorker.register('/service-worker.js');
              console.log('Service Worker registered:', newRegistration);
            }
          } catch (error) {
            console.error('Service Worker registration failed:', error);
          }
        }
        
        // Send a test notification
        setTimeout(() => {
          try {
            new Notification('Notifications Enabled', {
              body: 'You will now receive notifications when your books are available',
              icon: '/icon-192x192.png'
            });
          } catch (err) {
            console.error('Error sending test notification:', err);
          }
        }, 1000);
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
        disabled={loading || permissionState === 'granted'}
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