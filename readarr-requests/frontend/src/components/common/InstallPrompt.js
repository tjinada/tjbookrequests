// src/components/common/InstallPrompt.js
import React, { useState, useEffect } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const InstallPrompt = () => {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if iOS
    const isIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    };

    // Check if user has already seen the prompt
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

    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
    };
  }, []);

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
    }
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
    </>
  );
};

export default InstallPrompt;