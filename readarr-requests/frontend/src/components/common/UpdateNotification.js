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
      console.log('Service worker update detected');
      setShowUpdateNotification(true);
    };

    window.addEventListener('serviceWorkerUpdate', handleServiceWorkerUpdate);
    
    // Also check if there's an update waiting when component mounts
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration && registration.waiting) {
          // If there's a waiting service worker, show update notification
          setShowUpdateNotification(true);
        }
      });
    }

    return () => {
      window.removeEventListener('serviceWorkerUpdate', handleServiceWorkerUpdate);
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
        maxWidth: 400
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