// src/components/books/SwipeableBookCard.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import InfoIcon from '@mui/icons-material/Info';
import { useTheme } from '@mui/material/styles';
import BookCard from './BookCard';

const SwipeableBookCard = ({ book, onRequest }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  return (
    <Box 
      sx={{ 
        position: 'relative', 
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        // Add subtle shadow to card
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
      onClick={() => navigate(`/book/${book.id}`)}
      className="book-card-container"
    >
      {/* Action buttons */}
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
        onClick={(e) => e.stopPropagation()} // Prevent navigation when buttons are clicked
      >
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/book/${book.id}`);
          }}
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
          onClick={(e) => {
            e.stopPropagation();
            onRequest && onRequest(book);
          }}
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

      {/* The BookCard content */}
      <BookCard book={book} />
    </Box>
  );
};

export default SwipeableBookCard;