// src/components/books/SwipeableBookCard.js
import React, { useState, useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import InfoIcon from '@mui/icons-material/Info';
import { useTheme } from '@mui/material/styles';
import BookCard from './BookCard';

const SwipeableBookCard = ({ book, onRequest, carouselMode = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipePercentage, setSwipePercentage] = useState(0);
  const cardRef = useRef(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isInCarousel, setIsInCarousel] = useState(carouselMode);
  
  // Function to optimize image URL for better quality
  const getOptimizedImageUrl = (url) => {
    if (!url) return null;
    
    // Google Books specific optimizations
    if (url.includes('books.google.com')) {
      let optimizedUrl = url;
      
      // Ensure HTTPS
      if (optimizedUrl.startsWith('http://')) {
        optimizedUrl = optimizedUrl.replace('http://', 'https://');
      }
      
      // Remove edge curl effect
      optimizedUrl = optimizedUrl.replace('&edge=curl', '');
      
      // Set zoom to 0 (best quality)
      if (optimizedUrl.includes('zoom=')) {
        optimizedUrl = optimizedUrl.replace(/zoom=\d/, 'zoom=0');
      } else {
        optimizedUrl = optimizedUrl + '&zoom=0';
      }
      
      return optimizedUrl;
    }
    
    // OpenLibrary specific optimizations
    if (url.includes('openlibrary.org')) {
      // Ensure we're using the largest image size
      return url.replace('-M.jpg', '-L.jpg');
    }
    
    return url;
  };

  // Create optimized version of the book with high-quality cover
  const optimizedBook = {
    ...book,
    cover: getOptimizedImageUrl(book.cover)
  };

  // Check if card is actually inside a carousel
  useEffect(() => {
    if (cardRef.current) {
      // Check if any parent has a carousel data attribute or class
      let parent = cardRef.current.parentElement;
      while (parent) {
        if (parent.dataset && parent.dataset.carousel === 'true' || 
            parent.classList && parent.classList.contains('book-carousel')) {
          setIsInCarousel(true);
          break;
        }
        parent = parent.parentElement;
      }
    }
  }, []);

  // For touch events on card body
  const handleTouchStart = (e) => {
    // Skip swipe handling if we're in a carousel
    if (isInCarousel) return;
    
    // Setup for card-specific swipe
    setIsSwiping(true);
  };

  // Helper to determine if we're trying to scroll the page
  const isVerticalScrollAttempt = (deltaX, deltaY) => {
    // If primarily vertical motion (1.5x more vertical than horizontal)
    return Math.abs(deltaY) > Math.abs(deltaX) * 1.5;
  };

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Skip if in carousel or if we're trying to scroll the page
      if (isInCarousel || !isSwiping) return;
      
      // Check if this is likely a scroll attempt
      if (isVerticalScrollAttempt(eventData.deltaX, eventData.deltaY)) {
        setSwipeDirection(null);
        setSwipePercentage(0);
        return;
      }

      // Calculate swipe percentage (0-100)
      const maxSwipeDistance = 100; // pixels - reduced for easier activation
      const percentage = Math.min(100, Math.abs(eventData.deltaX) / maxSwipeDistance * 100);

      setSwipeDirection(eventData.deltaX > 0 ? 'right' : 'left');
      setSwipePercentage(percentage);
    },
    onSwipedLeft: (eventData) => {
      // Skip if in carousel
      if (isInCarousel || !isSwiping) {
        setIsSwiping(false);
        return;
      }
      
      // Only trigger if this was primarily a horizontal swipe
      if (!isVerticalScrollAttempt(eventData.deltaX, eventData.deltaY)) {
        // Only trigger if swiped far enough - reduced threshold for easier activation
        if (swipePercentage > 30 && onRequest) {
          onRequest(optimizedBook);
        }
      }
      // Reset state
      setSwipeDirection(null);
      setSwipePercentage(0);
      setIsSwiping(false);
    },
    onSwipedRight: (eventData) => {
      // Skip if in carousel
      if (isInCarousel || !isSwiping) {
        setIsSwiping(false);
        return;
      }
      
      // Only trigger if this was primarily a horizontal swipe
      if (!isVerticalScrollAttempt(eventData.deltaX, eventData.deltaY)) {
        // Only trigger if swiped far enough - reduced threshold for easier activation
        if (swipePercentage > 30) {
          navigate(`/book/${book.id}`);
        }
      }
      // Reset state
      setSwipeDirection(null);
      setSwipePercentage(0);
      setIsSwiping(false);
    },
    onSwiped: () => {
      // Reset state on any swipe end
      setSwipeDirection(null);
      setSwipePercentage(0);
      setIsSwiping(false);
    },
    preventScrollOnSwipe: false,
    trackTouch: true,
    delta: 10, // More sensitive detection
  });

  // For touch events on card body
  const cardHandlers = {
    onTouchStart: (e) => {
      if (!isInCarousel) {
        e.stopPropagation();
        handleTouchStart(e);
      }
    }
  };

  return (
    <Box 
      {...handlers} 
      ref={cardRef}
      sx={{ 
        position: 'relative', 
        touchAction: 'pan-y', // Always allow vertical scrolling
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        // Add subtle shadow to card
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
      {...cardHandlers}
      data-cardswipe="true"
      className="book-card-swipeable"
    >
      {/* IMPROVED ACTION BUTTONS - Repositioned to right side */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <IconButton
          size="small"
          onClick={() => navigate(`/book/${book.id}`)}
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.9)' : 'rgba(25, 118, 210, 0.9)',
            color: '#ffffff',
            '&:hover': { 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 1)' : 'rgba(25, 118, 210, 1)',
              transform: 'scale(1.1)'
            },
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            width: 36,
            height: 36,
            transition: 'all 0.2s ease',
          }}
        >
          <InfoIcon fontSize="small" />
        </IconButton>
        
        <IconButton
          size="small"
          onClick={() => onRequest && onRequest(optimizedBook)}
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.9)' : 'rgba(211, 47, 47, 0.9)',
            color: '#ffffff',
            '&:hover': { 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 1)' : 'rgba(211, 47, 47, 1)',
              transform: 'scale(1.1)'
            },
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            width: 36,
            height: 36,
            transition: 'all 0.2s ease',
          }}
        >
          <BookmarkAddIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Left swipe indicator (request) */}
      {swipeDirection === 'left' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '40%',
            bgcolor: 'rgba(211, 47, 47, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: swipePercentage / 100,
            pointerEvents: 'none'
          }}
        >
          <Box
            sx={{
              width: 50, // Slightly smaller
              height: 50,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'error.main',
              mb: 1,
              boxShadow: theme.shadows[3]
            }}
          >
            <BookmarkAddIcon sx={{ color: 'white', fontSize: '1.5rem' }} />
          </Box>
          <Typography 
            variant="subtitle2" 
            color="white"
            fontWeight="bold"
            sx={{ 
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              backgroundColor: 'rgba(0,0,0,0.3)',
              px: 1.5,
              py: 0.5,
              borderRadius: 2
            }}
          >
            Request
          </Typography>
        </Box>
      )}

      {/* Right swipe indicator (details) */}
      {swipeDirection === 'right' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '40%',
            bgcolor: 'rgba(25, 118, 210, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: swipePercentage / 100,
            pointerEvents: 'none'
          }}
        >
          <Box
            sx={{
              width: 50, // Slightly smaller
              height: 50,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              mb: 1,
              boxShadow: theme.shadows[3]
            }}
          >
            <InfoIcon sx={{ color: 'white', fontSize: '1.5rem' }} />
          </Box>
          <Typography 
            variant="subtitle2" 
            color="white"
            fontWeight="bold"
            sx={{ 
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              backgroundColor: 'rgba(0,0,0,0.3)',
              px: 1.5,
              py: 0.5,
              borderRadius: 2
            }}
          >
            Details
          </Typography>
        </Box>
      )}

      {/* The BookCard content */}
      <Box 
        sx={{ 
          transform: swipeDirection 
            ? `translateX(${swipeDirection === 'right' ? swipePercentage : -swipePercentage}px)` 
            : 'none',
          transition: swipeDirection ? 'none' : 'transform 0.3s ease',
          height: '100%',
          position: 'relative',
          zIndex: 0
        }}
      >
        <BookCard book={optimizedBook} />
      </Box>
    </Box>
  );
};

export default SwipeableBookCard;