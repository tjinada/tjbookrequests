// src/components/books/BookCard.js
import React from 'react';
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import useMediaQuery from '@mui/material/useMediaQuery';
import StarIcon from '@mui/icons-material/Star';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import noImage from '../../assets/no-image.png';

// Function to get the best available image from a book object
const getBestCoverImage = (book) => {
  if (!book) return null;
  
  // First check if imageLinks exists and has thumbnails (Google Books API)
  if (book.imageLinks) {
    // Try to get the largest available image in descending order of quality
    return book.imageLinks.extraLarge || 
           book.imageLinks.large || 
           book.imageLinks.medium || 
           book.imageLinks.small || 
           book.imageLinks.thumbnail;
  }
  
  // Fallback to cover property if imageLinks is not available
  return book.cover || null;
};

// Function to optimize image URL for better quality
const getOptimizedImageUrl = (url) => {
  if (!url) return null;
  
  // Handle Google Books URLs
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
      optimizedUrl = optimizedUrl.replace(/zoom=\d/, 'zoom=1');
    } else {
      optimizedUrl = optimizedUrl + '&zoom=1';
    }
    
    return optimizedUrl;
  }
  
  // Handle OpenLibrary URLs
  if (url.includes('openlibrary.org')) {
    // Use largest available image size
    return url.replace('-M.jpg', '-L.jpg');
  }
  
  return url;
};

const BookCard = ({ book, showRating = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Format the year from the release date
  const year = book.releaseDate 
    ? new Date(book.releaseDate).getFullYear() 
    : (book.year || null);

  // Get the best available cover image and optimize it
  const bestCoverImage = getBestCoverImage(book);
  const optimizedCover = getOptimizedImageUrl(bestCoverImage);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: 'none', // Remove default shadow as parent will handle it
        transition: 'all 0.3s ease',
        transform: 'translateZ(0)', // Hardware acceleration
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 10px 30px rgba(0,0,0,0.4)'
            : '0 10px 30px rgba(0,0,0,0.12)',
        }
      }}
    >
      {/* Full Cover Image - Made larger with better aspect ratio */}
      <CardMedia
        component="img"
        image={optimizedCover || noImage}
        alt={book.title}
        sx={{
          height: 220, // Fixed height for consistency
          width: '100%',
          objectFit: 'cover',         
          objectPosition: 'center top',
          imageRendering: 'high-quality',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
        }}
        loading="lazy"
      />

      {/* Rating Badge */}
      {showRating && book.rating > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: 10,
            pl: 0.8,
            pr: 1.2,
            py: 0.3,
            gap: 0.3,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontSize: '0.75rem'
          }}
        >
          <StarIcon fontSize="inherit" sx={{ color: 'gold', fontSize: '0.9rem' }} />
          <Typography variant="caption" fontWeight="bold">
            {typeof book.rating === 'number' ? book.rating.toFixed(1) : '5.0'}
          </Typography>
        </Box>
      )}

      {/* Year Badge */}
      {year && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: 10,
            px: 1.2,
            py: 0.3,
            gap: 0.3,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontSize: '0.75rem'
          }}
        >
          <CalendarTodayOutlinedIcon fontSize="inherit" />
          <Typography variant="caption" fontWeight="bold">
            {year}
          </Typography>
        </Box>
      )}

      {/* Book Info Overlay - Enhanced gradient and positioning */}
      <Box
        className="bookCardOverlay"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0) 100%)',
          color: 'white',
          p: 1.5,
          opacity: 1, // Always visible for better readability
          minHeight: '35%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          backdropFilter: 'blur(2px)'
        }}
      >
        <Typography 
          variant="subtitle1" 
          component="h2"
          sx={{ 
            fontWeight: 'bold',
            lineHeight: 1.2,
            mb: 0.5,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            fontSize: '0.95rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {book.title}
        </Typography>

        <Typography 
          variant="body2" 
          sx={{ 
            opacity: 0.9,
            fontWeight: 500,
            fontSize: '0.8rem',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {book.author}
        </Typography>

        {/* Genres (if available) */}
        {book.genres && book.genres.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 'auto', pt: 0.5 }}>
            {book.genres.slice(0, 2).map((genre, index) => (
              <Chip
                key={`${genre}-${index}`}
                label={genre}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  fontWeight: 500,
                  '& .MuiChip-label': {
                    px: 0.8
                  }
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Card>
  );
};

export default BookCard;