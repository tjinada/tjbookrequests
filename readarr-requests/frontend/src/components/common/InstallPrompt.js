// src/components/common/InstallPrompt.js
import React, { useState, useEffect, useContext } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import AuthContext from '../../context/AuthContext';
import api from '../../utils/api';

const InstallPrompt = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [notificationDialog, setNotificationDialog] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    };

    // Check if user has already seen the install prompt
    const hasSeenPrompt = localStorage.getItem('installPromptSeen');

    // Show iOS prompt if on iOS device and not seen before
    if (isIOS() && !hasSeenPrompt && !window.navigator.standalone) {
      // Delay showing prompt
      setTimeout(() => setShowIOSPrompt(true), 3000);
    }

    // Handle PWA install prompt for Android/Chrome
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      // Save the event for later use
      setDeferredPrompt(e);
      // Show prompt if not seen before
      if (!hasSeenPrompt) {
        setTimeout(() => setShowAndroidPrompt(true), 3000);
      }
    });

    // Detect when the app is successfully installed
    window.addEventListener('appinstalled', (e) => {
      setIsInstalled(true);
      setShowAndroidPrompt(false);
      setShowIOSPrompt(false);
      
      // Show notification prompt if the user is authenticated
      if (isAuthenticated && notificationPermission !== 'granted') {
        setTimeout(() => setNotificationDialog(true), 1500);
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
      window.removeEventListener('appinstalled', () => {});
    };
  }, [isAuthenticated, notificationPermission]);

  // Get VAPID public key from the server
  const getVapidPublicKey = async () => {
    try {
      const response = await api.get('/notifications/vapid-public-key');
      return response.data.vapidPublicKey;
    } catch (error) {
      console.error('Error getting VAPID key:', error);
      throw error;
    }
  };

  // Save subscription to the server
  const saveSubscription = async (subscription) => {
    try {
      console.log('Saving subscription to server:', subscription);
      const response = await api.post('/notifications/subscribe', { subscription });
      console.log('Subscription saved successfully:', response.data);
      return true;
    } catch (error) {
      console.error('Failed to save subscription:', error);
      return false;
    }
  };

  const handleClose = () => {
    setShowIOSPrompt(false);
    setShowAndroidPrompt(false);
    localStorage.setItem('installPromptSeen', 'true');
  };

  const handleInstall = async () => {
    setShowAndroidPrompt(false);

    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      // We've used the prompt, and can't use it again
      setDeferredPrompt(null);

      // Record in localStorage
      localStorage.setItem('installPromptSeen', 'true');

      console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
      
      // If installed, prompt for notifications after a short delay
      if (outcome === 'accepted') {
        setIsInstalled(true);
        if (isAuthenticated && notificationPermission !== 'granted') {
          setTimeout(() => setNotificationDialog(true), 1500);
        }
      }
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    try {
      if (!('Notification' in window)) {
        console.warn('Notifications not supported in this browser');
        return;
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
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
            await saveSubscription(subscription);
            
            // Send a test notification
            try {
              await api.post('/notifications/test');
              console.log('Test notification sent');
            } catch (testError) {
              console.error('Error sending test notification:', testError);
            }
          } catch (error) {
            console.error('Service Worker or subscription error:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setNotificationDialog(false);
    }
  };

  // Close notification dialog without enabling
  const handleCloseNotificationDialog = () => {
    setNotificationDialog(false);
  };

  const IOSInstructions = (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold">
        Install this app on your iPhone
      </Typography>
      <Typography variant="body2">
        1. Tap the share icon <Box component="span" sx={{ fontSize: '1.2em' }}>↑</Box>
      </Typography>
      <Typography variant="body2">
        2. Scroll down and tap "Add to Home Screen"
      </Typography>
    </Box>
  );

  return (
    <>
      {/* iOS Prompt */}
      <Snackbar
        open={showIOSPrompt}
        onClose={handleClose}
        message={IOSInstructions}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={handleClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
        sx={{ 
          '& .MuiSnackbarContent-root': { 
            bgcolor: 'background.paper', 
            color: 'text.primary',
            width: '100%',
            maxWidth: 320
          }
        }}
      />

      {/* Android Prompt */}
      <Snackbar
        open={showAndroidPrompt}
        onClose={handleClose}
        message="Add this app to your home screen"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        action={
          <>
            <Button color="primary" size="small" onClick={handleInstall} startIcon={<AddToHomeScreenIcon />}>
              Install
            </Button>
            <IconButton
              size="small"
              color="inherit"
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
      />

      {/* Notification Permission Dialog */}
      <Dialog
        open={notificationDialog}
        onClose={handleCloseNotificationDialog}
        aria-labelledby="notification-dialog-title"
      >
        <DialogTitle id="notification-dialog-title">
          Enable Notifications
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Would you like to receive notifications about your book requests? 
            We'll let you know when your requested books become available or when there 
            are updates to your requests.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNotificationDialog}>Not Now</Button>
          <Button 
            onClick={requestNotificationPermission} 
            variant="contained" 
            color="primary"
            startIcon={<NotificationsIcon />}
            autoFocus
          >
            Enable Notifications
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InstallPrompt;