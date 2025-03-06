// src/components/books/SwipeableBookCard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import BookCard from './BookCard';

const SwipeableBookCard = ({ book }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  // Handle click to navigate to book details
  const handleClick = () => {
    navigate(`/book/${book.id}`);
  };
  
  return (
    <Box 
      sx={{ 
        position: 'relative', 
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }
      }}
      onClick={handleClick}
      className="book-card-container"
    >
      <BookCard book={book} />
    </Box>
  );
};

export default SwipeableBookCard;