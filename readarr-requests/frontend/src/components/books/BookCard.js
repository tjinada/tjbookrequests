// src/components/books/BookCard.js
import React from 'react';
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import Chip from '@mui/material/Chip';
import useMediaQuery from '@mui/material/useMediaQuery';
import StarIcon from '@mui/icons-material/Star';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import noImage from '../../assets/no-image.png';

const BookCard = ({ book, showRating = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Format the year from the release date
  const year = book.releaseDate 
    ? new Date(book.releaseDate).getFullYear() 
    : (book.year || null);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 8px 40px rgba(0,0,0,0.4)'
          : '0 8px 40px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
        transform: 'translateZ(0)', // Hardware acceleration
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 20px 60px rgba(0,0,0,0.5)'
            : '0 20px 60px rgba(0,0,0,0.15)',
          '& .bookCardOverlay': {
            opacity: 1,
            transform: 'translateY(0)'
          }
        }
      }}
    >
      {/* Full Cover Image */}
      <CardMedia
        component="img"
        image={book.cover || noImage}
        alt={book.title}
        sx={{
          height: '100%',
          flexGrow: 1,
          width: '100%',
          objectFit: 'cover',         // Changed from contain to cover for better appearance
          objectPosition: 'center top',
          aspectRatio: '2/3',
          imageRendering: 'high-quality', // Encourage high-quality rendering
          // Add a small blur to edges to make image appear sharper
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
        }}
        loading="lazy" // Add lazy loading for performance
      />

      {/* Rating Badge */}
      {showRating && book.rating > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: 10,
            pl: 1,
            pr: 1.5,
            py: 0.5,
            gap: 0.5,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          <StarIcon fontSize="small" sx={{ color: 'gold' }} />
          <Typography variant="body2" fontWeight="bold">
            {book.rating.toFixed(1)}
          </Typography>
        </Box>
      )}

      {/* Year Badge */}
      {year && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: 10,
            px: 1.5,
            py: 0.5,
            gap: 0.5,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          <CalendarTodayOutlinedIcon fontSize="small" />
          <Typography variant="body2" fontWeight="bold">
            {year}
          </Typography>
        </Box>
      )}

      {/* Book Info Overlay (appears on hover) */}
      <Box
        className="bookCardOverlay"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0) 100%)',
          color: 'white',
          p: 2,
          opacity: isMobile ? 1 : 0.9, // Always visible on mobile
          transform: isMobile ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.3s ease',
          minHeight: '30%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          backdropFilter: 'blur(3px)'
        }}
      >
        <Typography 
          variant="h6" 
          component="h2"
          sx={{ 
            fontWeight: 'bold',
            lineHeight: 1.2,
            mb: 1,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            fontSize: isMobile ? '1rem' : '1.1rem'
          }}
        >
          {book.title}
        </Typography>

        <Typography 
          variant="body2" 
          sx={{ 
            mb: 1,
            opacity: 0.9,
            fontWeight: 500,
            fontSize: '0.9rem'
          }}
        >
          {book.author}
        </Typography>

        {/* Genres (if available) */}
        {book.genres && book.genres.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mt: 'auto' }}>
            {book.genres.slice(0, 2).map((genre) => (
              <Chip
                key={genre}
                label={genre}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 500,
                  backdropFilter: 'blur(5px)'
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