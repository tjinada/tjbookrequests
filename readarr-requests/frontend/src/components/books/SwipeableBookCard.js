// src/components/books/SwipeableBookCard.js
import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import BookCard from './BookCard';
import IconButton from '@mui/material/IconButton';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import InfoIcon from '@mui/icons-material/Info';

const SwipeableBookCard = ({ book, onRequest }) => {
  const navigate = useNavigate();
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipePercentage, setSwipePercentage] = useState(0);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Only handle horizontal swipes to avoid interfering with scrolling
      if (Math.abs(eventData.deltaY) > Math.abs(eventData.deltaX)) {
        // This is likely a scroll attempt, don't interfere
        return;
      }

      // Calculate swipe percentage (0-100)
      const maxSwipeDistance = 150; // pixels
      const percentage = Math.min(100, Math.abs(eventData.deltaX) / maxSwipeDistance * 100);

      setSwipeDirection(eventData.deltaX > 0 ? 'right' : 'left');
      setSwipePercentage(percentage);
    },
    onSwipedLeft: (eventData) => {
      // Only trigger if this was primarily a horizontal swipe
      if (Math.abs(eventData.deltaY) < Math.abs(eventData.deltaX)) {
        // Only trigger if swiped far enough
        if (swipePercentage > 40 && onRequest) {
          onRequest(book);
        }
      }
      // Reset state
      setSwipeDirection(null);
      setSwipePercentage(0);
    },
    onSwipedRight: (eventData) => {
      // Only trigger if this was primarily a horizontal swipe
      if (Math.abs(eventData.deltaY) < Math.abs(eventData.deltaX)) {
        // Only trigger if swiped far enough
        if (swipePercentage > 40) {
          navigate(`/book/${book.id}`);
        }
      }
      // Reset state
      setSwipeDirection(null);
      setSwipePercentage(0);
    },
    onSwiped: () => {
      // Reset state on any swipe end
      setSwipeDirection(null);
      setSwipePercentage(0);
    },
    // Critical settings for proper scrolling behavior
    trackMouse: false,
    preventScrollOnSwipe: false, // This is key - don't prevent scrolling
    trackTouch: true,
    delta: 15, // Increase this to require more intentional swipes
    swipeDuration: 250 // Faster swipes are more likely to be intentional
  });

  // Calculate styles based on swipe
  const getSwipeStyles = () => {
    if (!swipeDirection) return {};

    // Calculate opacity based on swipe percentage
    const opacity = swipePercentage / 100;

    // Calculate transform for the card itself
    const transform = `translateX(${swipeDirection === 'right' ? swipePercentage : -swipePercentage}px)`;

    return {
      transform,
      opacity
    };
  };

  return (
    <Box 
      {...handlers} 
      sx={{ 
        position: 'relative', 
        touchAction: 'pan-y', // Allow vertical scrolling
        height: '100%',
        overflow: 'hidden',
        borderRadius: 1
      }}
    >
      {/* Action indicators that show during swipe */}
      {swipeDirection === 'left' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '40%',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: swipePercentage / 200, // Fade in gradually
            zIndex: 1,
            pointerEvents: 'none' // Allow scroll events to pass through
          }}
        >
          <BookmarkAddIcon sx={{ color: 'white', fontSize: '2rem' }} />
        </Box>
      )}

      {swipeDirection === 'right' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '40%',
            bgcolor: 'info.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: swipePercentage / 200, // Fade in gradually
            zIndex: 1,
            pointerEvents: 'none' // Allow scroll events to pass through
          }}
        >
          <InfoIcon sx={{ color: 'white', fontSize: '2rem' }} />
        </Box>
      )}

      {/* The actual BookCard with transform applied during swipe */}
      <Box sx={{ 
        transform: swipeDirection ? getSwipeStyles().transform : 'none',
        transition: swipeDirection ? 'none' : 'transform 0.3s ease',
        height: '100%',
        position: 'relative',
        zIndex: 2,
        bgcolor: 'background.paper',
        touchAction: 'pan-y' // Allow vertical scrolling
      }}>
        <BookCard book={book} />
      </Box>
    </Box>
  );
};

export default SwipeableBookCard;