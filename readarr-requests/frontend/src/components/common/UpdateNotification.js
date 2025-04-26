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
    // Add listener for service worker update event
    const handleServiceWorkerUpdate = (event) => {
      console.log('Service worker update detected via event');
      setShowUpdateNotification(true);
    };

    // Add listener for service worker messages
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'SERVICE_WORKER_UPDATED') {
        console.log('Service worker update detected via message');
        setShowUpdateNotification(true);
      }
    };

    // Listen for both update events and direct messages
    window.addEventListener('serviceWorkerUpdate', handleServiceWorkerUpdate);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    
    // Also check if there's an update waiting when component mounts
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration && registration.waiting) {
          console.log('Update waiting on component mount');
          // If there's a waiting service worker, show update notification
          setShowUpdateNotification(true);
        }
      });

      // Check for updates every 5 minutes
      const updateCheckInterval = setInterval(() => {
        console.log('Checking for service worker updates...');
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            registration.update().catch(error => {
              console.error('Error checking for service worker updates:', error);
            });
          }
        });
      }, 5 * 60 * 1000);

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
    updateAndRefresh();
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