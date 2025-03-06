// src/components/books/SwipeableBookCard.js
import React, { useState, useRef } from 'react';
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
  const touchStartXRef = useRef(0);
  
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

  // Track if touch is intended for card swipe vs carousel scroll
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    
    // Only set swiping mode if we're not in a carousel
    // Or if we explicitly intend to swipe the card (touch started on the card)
    const parentElement = e.currentTarget.closest('[data-touchcarousel="true"]');
    if (!parentElement) {
      setIsSwiping(true);
    }
  };

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Skip if we're in carousel mode and not explicitly swiping this card
      if (carouselMode && !isSwiping) return;
      
      // Only handle horizontal swipes
      if (Math.abs(eventData.deltaY) > Math.abs(eventData.deltaX)) {
        return;
      }

      // Calculate swipe percentage (0-100)
      const maxSwipeDistance = 100; // pixels - reduced for easier activation
      const percentage = Math.min(100, Math.abs(eventData.deltaX) / maxSwipeDistance * 100);

      setSwipeDirection(eventData.deltaX > 0 ? 'right' : 'left');
      setSwipePercentage(percentage);
    },
    onSwipedLeft: (eventData) => {
      // Skip if we're in carousel mode and not explicitly swiping this card
      if (carouselMode && !isSwiping) {
        setIsSwiping(false);
        return;
      }
      
      // Only trigger if this was primarily a horizontal swipe
      if (Math.abs(eventData.deltaY) < Math.abs(eventData.deltaX)) {
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
      // Skip if we're in carousel mode and not explicitly swiping this card
      if (carouselMode && !isSwiping) {
        setIsSwiping(false);
        return;
      }
      
      // Only trigger if this was primarily a horizontal swipe
      if (Math.abs(eventData.deltaY) < Math.abs(eventData.deltaX)) {
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
      e.stopPropagation();
      handleTouchStart(e);
    }
  };

  return (
    <Box 
      {...handlers} 
      ref={cardRef}
      sx={{ 
        position: 'relative', 
        touchAction: carouselMode ? 'pan-x' : 'pan-y',
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        // Add subtle shadow to card
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
      {...cardHandlers}
      data-cardswipe="true"
    >
      {/* IMPROVED ACTION BUTTONS */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          gap: 2
        }}
      >
        <IconButton
          size="medium"
          onClick={() => navigate(`/book/${book.id}`)}
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.9)' : 'rgba(25, 118, 210, 0.9)',
            color: '#ffffff',
            '&:hover': { 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 1)' : 'rgba(25, 118, 210, 1)',
              transform: 'scale(1.1)'
            },
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            width: 48,
            height: 48,
            transition: 'all 0.2s ease',
          }}
        >
          <InfoIcon />
        </IconButton>
        
        <IconButton
          size="medium"
          onClick={() => onRequest && onRequest(optimizedBook)}
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.9)' : 'rgba(211, 47, 47, 0.9)',
            color: '#ffffff',
            '&:hover': { 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 1)' : 'rgba(211, 47, 47, 1)',
              transform: 'scale(1.1)'
            },
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            width: 48,
            height: 48,
            transition: 'all 0.2s ease',
          }}
        >
          <BookmarkAddIcon />
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