// src/components/layout/ScrollContainer.js
import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';

const ScrollContainer = ({ children }) => {
  const containerRef = useRef(null);

  // Add event listeners to handle touch events properly
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Helper to determine if the touch started on a card or swipeable element
    const isTouchOnSwipeableElement = (event) => {
      const target = event.target;
      let currentNode = target;
      
      // Check if the touch is on a card swipe element or its children
      while (currentNode != null) {
        if (currentNode.dataset && 
            (currentNode.dataset.cardswipe === 'true' || 
             currentNode.classList.contains('bookCardOverlay'))) {
          return true;
        }
        currentNode = currentNode.parentNode;
      }
      return false;
    };

    // Store initial touch position for determining scroll direction
    let startY = 0;
    let startX = 0;
    let initialScrollTop = 0;
    let isScrolling = false;

    const handleTouchStart = (e) => {
      // Store the initial touch position
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      initialScrollTop = container.scrollTop;
      isScrolling = false;
      
      // If we're at the top or bottom of the container, allow pull-to-refresh
      // or overscroll behavior from browser
      if (container.scrollTop <= 0 || 
          container.scrollTop + container.clientHeight >= container.scrollHeight) {
        return;
      }
    };

    const handleTouchMove = (e) => {
      // Skip if we already determined scrolling direction
      if (isScrolling) return;
      
      const deltaY = startY - e.touches[0].clientY;
      const deltaX = startX - e.touches[0].clientX;
      
      // If it's primarily a vertical scroll
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        isScrolling = true;
        
        // If the touch is on a swipeable element, we need to check
        // if we should scroll the container or let the card handle it
        if (isTouchOnSwipeableElement(e)) {
          // Allow container scrolling to take precedence for primarily vertical swipes
          e.stopPropagation();
        }
      }
    };

    // Attach the event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Clean up event listeners when component unmounts
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
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