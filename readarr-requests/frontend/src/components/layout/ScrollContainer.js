// src/components/layout/ScrollContainer.js
import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';

const ScrollContainer = ({ children }) => {
  const containerRef = useRef(null);

  // Add global event listeners to handle touch events properly on all elements
  useEffect(() => {
    // Disable all horizontal swiping on book cards when user is scrolling vertically
    let isVerticalScrolling = false;
    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;
    
    const handleGlobalTouchStart = (e) => {
      // Store initial touch position and time
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchStartTime = Date.now();
      isVerticalScrolling = false;
    };

    const handleGlobalTouchMove = (e) => {
      // If we don't have a touch start position, exit
      if (touchStartY === 0) return;
      
      // Calculate distance moved
      const deltaY = touchStartY - e.touches[0].clientY;
      const deltaX = touchStartX - e.touches[0].clientX;
      const moveTime = Date.now() - touchStartTime;
      
      // If movement is primarily vertical (1.2x more vertical than horizontal)
      // and it's not just a tap (moved more than 10px)
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.2 && Math.abs(deltaY) > 10) {
        isVerticalScrolling = true;
        
        // Find if we're over a card element
        let targetElement = e.target;
        while (targetElement) {
          // If we're over a book card while trying to scroll vertically
          if (targetElement.classList && 
              (targetElement.classList.contains('MuiCard-root') || 
               targetElement.dataset && targetElement.dataset.cardswipe === 'true')) {
            
            // Prevent default to disable card swiping during vertical scrolling
            e.stopPropagation();
            return;
          }
          targetElement = targetElement.parentElement;
        }
      }
    };
    
    const handleGlobalTouchEnd = () => {
      // Reset tracking variables
      touchStartY = 0;
      touchStartX = 0;
      isVerticalScrolling = false;
    };
    
    // Add global event listeners
    document.addEventListener('touchstart', handleGlobalTouchStart, {passive: true});
    document.addEventListener('touchmove', handleGlobalTouchMove, {passive: false});
    document.addEventListener('touchend', handleGlobalTouchEnd, {passive: true});
    
    return () => {
      document.removeEventListener('touchstart', handleGlobalTouchStart);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        '::-webkit-scrollbar': {
          width: '4px', // Thinner scrollbar
        },
        '::-webkit-scrollbar-track': {
          background: 'rgba(0,0,0,0.03)',
        },
        '::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.15)',
          borderRadius: '4px',
        },
        scrollbarWidth: 'thin',
        touchAction: 'pan-y',
        position: 'relative',
        pb: { xs: 8, sm: 2 }, // Extra padding at the bottom for bottom nav
        // Remove container padding to allow full bleed
        mx: 0,
        px: 0,
      }}
      className="main-scroll-container"
    >
      {children}
    </Box>
  );
};

export default ScrollContainer;