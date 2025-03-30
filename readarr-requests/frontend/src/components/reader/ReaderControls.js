// src/components/reader/ReaderControls.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Fade,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const ReaderControls = ({ onPrev, onNext, currentPage, totalPages }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [visible, setVisible] = useState(false);
  const [idleTimer, setIdleTimer] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);

  // Show controls when user moves mouse, tap screen, or upon first load
  useEffect(() => {
    // Show controls initially for a few seconds
    setVisible(true);
    
    // Set a timer to hide controls after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);
    
    setIdleTimer(timer);
    
    // Setup event listeners for mouse movement and touch
    const handleInteraction = () => {
      setVisible(true);
      
      // Clear any existing timer
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      
      // Set a new timer to hide controls after 3 seconds of inactivity
      const newTimer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      
      setIdleTimer(newTimer);
    };
    
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    
    // Cleanup
    return () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [idleTimer]);

  // Handle touch navigation (swipe left/right)
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    
    // If the swipe is greater than 50px, navigate
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        onPrev();
      } else {
        onNext();
      }
    }
    
    setTouchStartX(null);
  };

  return (
    <>
      {/* Invisible touch layer for swipe navigation on mobile */}
      {isMobile && (
        <Box 
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
            touchAction: 'pan-y',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
      )}
      
      {/* Page turn buttons */}
      <Fade in={visible}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: { xs: 1, sm: 2 },
            pointerEvents: 'none', // Ensure that the box itself doesn't block touches/clicks
            zIndex: 2,
          }}
        >
          <IconButton
            onClick={onPrev}
            sx={{
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'background.default',
              },
              pointerEvents: 'auto', // Make the button clickable
            }}
            size={isMobile ? 'small' : 'medium'}
          >
            <ChevronLeftIcon />
          </IconButton>
          
          <IconButton
            onClick={onNext}
            sx={{
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'background.default',
              },
              pointerEvents: 'auto', // Make the button clickable
            }}
            size={isMobile ? 'small' : 'medium'}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Fade>
      
      {/* Page indicator */}
      <Fade in={visible}>
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            px: 2,
            py: 0.5,
            borderRadius: 20,
            zIndex: 2,
          }}
        >
          <Typography variant="body2">
            {currentPage > 0 && totalPages > 0 ? 
              `Page ${currentPage} of ${totalPages}` : 
              `Reading`}
          </Typography>
        </Box>
      </Fade>
    </>
  );
};

export default ReaderControls;