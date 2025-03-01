// src/components/books/SwipeableBookCard.js
import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import InfoIcon from '@mui/icons-material/Info';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { useTheme } from '@mui/material/styles';
import BookCard from './BookCard';

const SwipeableBookCard = ({ book, onRequest }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipePercentage, setSwipePercentage] = useState(0);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Only handle horizontal swipes
      if (Math.abs(eventData.deltaY) > Math.abs(eventData.deltaX)) {
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
    preventScrollOnSwipe: false,
    trackTouch: true,
    delta: 15,
  });

  return (
    <Box 
      {...handlers} 
      sx={{ 
        position: 'relative', 
        touchAction: 'pan-y',
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden'
      }}
    >
      {/* Left swipe indicator (request) */}
      {swipeDirection === 'left' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '40%',
            bgcolor: theme.palette.mode === 'dark' 
              ? 'rgba(0, 127, 255, 0.3)'
              : 'rgba(25, 118, 210, 0.1)',
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
              width: 60,
              height: 60,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              mb: 1,
              boxShadow: theme.shadows[5]
            }}
          >
            <BookmarkAddIcon sx={{ color: 'white', fontSize: '1.8rem' }} />
          </Box>
          <Typography 
            variant="subtitle1" 
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
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mt: 1
            }}
          >
            <ArrowBackIosNewIcon sx={{ fontSize: '1rem', color: 'white' }} />
            <Typography variant="caption" color="white">
              Swipe
            </Typography>
          </Box>
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
            bgcolor: theme.palette.mode === 'dark' 
              ? 'rgba(0, 200, 255, 0.3)' 
              : 'rgba(0, 200, 255, 0.1)',
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
              width: 60,
              height: 60,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'info.main',
              mb: 1,
              boxShadow: theme.shadows[5]
            }}
          >
            <InfoIcon sx={{ color: 'white', fontSize: '1.8rem' }} />
          </Box>
          <Typography 
            variant="subtitle1" 
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
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mt: 1
            }}
          >
            <Typography variant="caption" color="white">
              Swipe
            </Typography>
            <ArrowForwardIosIcon sx={{ fontSize: '1rem', color: 'white' }} />
          </Box>
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
          zIndex: 2
        }}
      >
        <BookCard book={book} />
      </Box>
    </Box>
  );
};

export default SwipeableBookCard;