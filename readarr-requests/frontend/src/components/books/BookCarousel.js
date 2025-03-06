// src/components/books/BookCarousel.js
import React, { useRef, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CircularProgress from '@mui/material/CircularProgress';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import InfoIcon from '@mui/icons-material/Info';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import BookCard from './BookCard'; // Use regular BookCard instead of swipeable
import { useNavigate } from 'react-router-dom';

const BookCarousel = ({ 
  title, 
  books = [], 
  loading = false, 
  onRequestBook,
  error = null,
  emptyMessage = "No books available"
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const carouselRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Card width + gap
  const itemWidth = isMobile ? 160 : 200;
  
  // Check if scroll position requires arrows
  const checkScrollButtons = () => {
    if (!carouselRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5); // 5px tolerance
  };
  
  // Scroll left/right by one item
  const handleScroll = (direction) => {
    if (!carouselRef.current || isScrolling) return;
    
    setIsScrolling(true);
    const scrollAmount = direction === 'left' ? -itemWidth : itemWidth;
    const currentScroll = carouselRef.current.scrollLeft;
    
    carouselRef.current.scrollTo({
      left: currentScroll + scrollAmount,
      behavior: 'smooth'
    });
    
    // Allow scroll checking after animation
    setTimeout(() => {
      checkScrollButtons();
      setIsScrolling(false);
    }, 300);
  };
  
  // Handle scroll event to update arrow visibility
  const handleScrollEvent = () => {
    if (!isScrolling) {
      checkScrollButtons();
    }
  };
  
  // Handle resize to check arrow visibility
  useEffect(() => {
    const handleResize = () => {
      checkScrollButtons();
    };
    
    window.addEventListener('resize', handleResize);
    checkScrollButtons(); // Initial check
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [books]);
  
  // Handle book click
  const handleBookClick = (book) => {
    navigate(`/book/${book.id}`);
  };

  if (loading) {
    return (
      <Box sx={{ my: 2 }}>
        {title && (
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {title}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ my: 2 }}>
        {title && (
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {title}
          </Typography>
        )}
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      </Box>
    );
  }
  
  if (!books || books.length === 0) {
    return (
      <Box sx={{ my: 2 }}>
        {title && (
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            {title}
          </Typography>
        )}
        <Typography color="text.secondary" variant="body2">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ my: 2, position: 'relative' }}>
      {/* Title row with arrows */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        {title && (
          <Typography variant="subtitle1" fontWeight="medium">
            {title}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex' }}>
          <IconButton 
            size="small" 
            onClick={() => handleScroll('left')}
            disabled={!showLeftArrow}
            sx={{ 
              opacity: showLeftArrow ? 1 : 0,
              transition: 'opacity 0.2s',
              bgcolor: 'background.paper',
              '&:hover': {
                bgcolor: 'action.hover'
              },
              boxShadow: 1
            }}
          >
            <KeyboardArrowLeftIcon />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handleScroll('right')}
            disabled={!showRightArrow}
            sx={{ 
              opacity: showRightArrow ? 1 : 0,
              transition: 'opacity 0.2s',
              ml: 0.5,
              bgcolor: 'background.paper',
              '&:hover': {
                bgcolor: 'action.hover'
              },
              boxShadow: 1
            }}
          >
            <KeyboardArrowRightIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Carousel container */}
      <Box
        ref={carouselRef}
        sx={{
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', // Firefox
          '&::-webkit-scrollbar': {
            display: 'none' // Chrome/Safari/Edge
          },
          px: 0.5, // Slight padding for shadow visibility
          mx: -0.5,
          pb: 1.5, // Space for shadow
          position: 'relative',
          '&::after': {
            // Fade indicator on the right side when more content is available
            content: '""',
            display: showRightArrow ? 'block' : 'none',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '40px',
            background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.05))',
            pointerEvents: 'none',
          }
        }}
        onScroll={handleScrollEvent}
        className="book-carousel"
      >
        {books.map((book, index) => (
          <Box 
            key={`${book.id}-${index}`}
            sx={{ 
              minWidth: isMobile ? 150 : 180,
              maxWidth: isMobile ? 150 : 180,
              height: isMobile ? 280 : 320,
              px: 0.5, // Space between cards
              '&:first-of-type': { pl: 0 },
              '&:last-of-type': { pr: 0 },
              position: 'relative',
              cursor: 'pointer'
            }}
            onClick={() => handleBookClick(book)}
          >
            <BookCard book={book} />
            
            {/* Action buttons directly in the card container */}
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
              onClick={(e) => e.stopPropagation()} // Prevent card click when buttons are clicked
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
                  onRequestBook && onRequestBook(book);
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
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default BookCarousel;