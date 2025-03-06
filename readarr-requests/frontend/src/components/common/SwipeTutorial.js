// src/components/common/SwipeTutorial.js
import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import SwipeLeftIcon from '@mui/icons-material/SwipeLeft';
import SwipeRightIcon from '@mui/icons-material/SwipeRight';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import InfoIcon from '@mui/icons-material/Info';

const SwipeTutorial = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen the tutorial
    const hasSeenTutorial = localStorage.getItem('swipeTutorialSeen');

    if (!hasSeenTutorial) {
      // Show tutorial after a short delay
      const timer = setTimeout(() => {
        setOpen(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem('swipeTutorialSeen', 'true');
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogContent>
        <Typography variant="h6" gutterBottom align="center">
          Swipe to Interact
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 4, mt: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              p: 2,
              bgcolor: 'info.light',
              borderRadius: 2,
              color: 'info.contrastText'
            }}>
              <SwipeRightIcon sx={{ fontSize: 40 }} />
              <InfoIcon sx={{ mt: 1 }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Swipe right for details
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              p: 2,
              bgcolor: 'primary.light',
              borderRadius: 2,
              color: 'primary.contrastText'
            }}>
              <SwipeLeftIcon sx={{ fontSize: 40 }} />
              <BookmarkAddIcon sx={{ mt: 1 }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Swipe left to request
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" align="center">
          You can swipe books left or right to quickly interact with them.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} autoFocus>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SwipeTutorial;