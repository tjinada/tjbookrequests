// src/components/common/UpdateNotification.js
import React, { useState, useEffect } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdate';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { updateAndRefresh } from '../../serviceWorker';

const UpdateNotification = () => {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  useEffect(() => {
    // Track if we've shown the notification recently to avoid spamming
    const hasShownRecentlyKey = 'update_notification_shown';
    const checkIfShownRecently = () => {
      const lastShown = localStorage.getItem(hasShownRecentlyKey);
      if (lastShown) {
        const timeSince = Date.now() - parseInt(lastShown);
        // Don't show again if shown in the last hour
        if (timeSince < 60 * 60 * 1000) {
          return true;
        }
      }
      return false;
    };

    // Mark that we've shown the notification
    const markAsShown = () => {
      localStorage.setItem(hasShownRecentlyKey, Date.now().toString());
    };

    // Add listener for service worker update event
    const handleServiceWorkerUpdate = (event) => {
      console.log('Service worker update detected via event');
      if (!checkIfShownRecently()) {
        setShowUpdateNotification(true);
        markAsShown();
      }
    };

    // Add listener for service worker messages
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'SERVICE_WORKER_UPDATED') {
        console.log('Service worker update detected via message');
        if (!checkIfShownRecently()) {
          setShowUpdateNotification(true);
          markAsShown();
        }
      }
    };

    // Listen for both update events and direct messages
    window.addEventListener('serviceWorkerUpdate', handleServiceWorkerUpdate);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    
    // Check if there's an update waiting when component mounts, but not if shown recently
    if ('serviceWorker' in navigator && !checkIfShownRecently()) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration && registration.waiting) {
          console.log('Update waiting on component mount');
          // If there's a waiting service worker, show update notification
          setShowUpdateNotification(true);
          markAsShown();
        }
      });

      // Check for updates every 30 minutes (reduced frequency)
      const updateCheckInterval = setInterval(() => {
        console.log('Checking for service worker updates...');
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            registration.update().catch(error => {
              console.error('Error checking for service worker updates:', error);
            });
          }
        });
      }, 30 * 60 * 1000);

      return () => {
        clearInterval(updateCheckInterval);
        window.removeEventListener('serviceWorkerUpdate', handleServiceWorkerUpdate);
        navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
      };
    }

    return () => {
      window.removeEventListener('serviceWorkerUpdate', handleServiceWorkerUpdate);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const handleUpdateClick = () => {
    setShowUpdateNotification(false);
    // Use our more robust force update method instead
    import('../../utils/pwaRecovery')
      .then(module => {
        console.log('Forcing complete PWA update');
        module.forceUpdatePWA();
      })
      .catch(err => {
        console.error('Error importing pwaRecovery:', err);
        // Fallback to the old method if import fails
        updateAndRefresh();
      });
  };

  const handleDismiss = () => {
    setShowUpdateNotification(false);
  };

  return (
    <Snackbar
      open={showUpdateNotification}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ 
        mb: 8, // Position above bottom navigation
        maxWidth: 400,
        zIndex: 9999 // Ensure it appears above everything else
      }}
    >
      <Alert 
        severity="info" 
        icon={<SystemUpdateIcon />}
        sx={{ width: '100%' }}
        action={
          <>
            <Button 
              color="primary" 
              size="small" 
              onClick={handleUpdateClick}
            >
              Update Now
            </Button>
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleDismiss}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
      >
        <Typography variant="body2">
          A new version is available!
        </Typography>
      </Alert>
    </Snackbar>
  );
};

export default UpdateNotification;