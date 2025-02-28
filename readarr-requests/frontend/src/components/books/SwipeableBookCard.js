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
      // Calculate swipe percentage (0-100)
      const maxSwipeDistance = 150; // pixels
      const percentage = Math.min(100, Math.abs(eventData.deltaX) / maxSwipeDistance * 100);

      setSwipeDirection(eventData.deltaX > 0 ? 'right' : 'left');
      setSwipePercentage(percentage);
    },
    onSwipedLeft: () => {
      // Request action
      if (swipePercentage > 40 && onRequest) { // Only trigger if swiped far enough
        onRequest(book);
      }
      // Reset state
      setSwipeDirection(null);
      setSwipePercentage(0);
    },
    onSwipedRight: () => {
      // Details action
      if (swipePercentage > 40) { // Only trigger if swiped far enough
        navigate(`/book/${book.id}`);
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
    trackMouse: false, // Only track touch events for better mobile experience
    preventScrollOnSwipe: true,
    delta: 10, // Min distance in px before a swipe starts
    trackTouch: true
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
        touchAction: 'pan-y',
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
            zIndex: 1
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
            zIndex: 1
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
        bgcolor: 'background.paper'
      }}>
        <BookCard book={book} />
      </Box>
    </Box>
  );
};

export default SwipeableBookCard;