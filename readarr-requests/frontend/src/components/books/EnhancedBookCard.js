// src/components/books/EnhancedBookCard.js
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

// Helper function to ensure high-quality cover URLs
const optimizeBookCover = (coverUrl) => {
  if (!coverUrl) return null;
  
  // Handle Google Books URLs
  if (coverUrl.includes('books.google.com')) {
    let optimizedUrl = coverUrl;
    
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
  
  // Handle OpenLibrary URLs
  if (coverUrl.includes('openlibrary.org')) {
    // Use largest available image size
    return coverUrl.replace('-M.jpg', '-L.jpg');
  }
  
  return coverUrl;
};

// Helper function to format and clean up author names
const formatAuthorName = (authorName) => {
  if (!authorName) return 'Unknown Author';
  
  // Remove any redundant parts like "(Author)" or excessive commas
  return authorName
    .replace(/\s*\(Author\)\s*/gi, '')
    .replace(/,\s*,/g, ',')
    .trim();
};

// Function to get the publication year from various date formats
const extractYear = (book) => {
  // If there's a year property, use that directly
  if (book.year) {
    return typeof book.year === 'number' ? book.year : parseInt(book.year);
  }
  
  // Try to extract from releaseDate if available
  if (book.releaseDate) {
    // Handle ISO date format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(book.releaseDate)) {
      return parseInt(book.releaseDate.substring(0, 4));
    }
    
    // Handle just year format
    if (/^\d{4}$/.test(book.releaseDate)) {
      return parseInt(book.releaseDate);
    }
    
    // Try parsing as a date and extracting year
    const date = new Date(book.releaseDate);
    if (!isNaN(date.getTime())) {
      return date.getFullYear();
    }
  }
  
  // No valid year found
  return null;
};

const EnhancedBookCard = ({ book, showRating = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Optimize cover URL
  const optimizedCover = optimizeBookCover(book.cover);
  
  // Format author name
  const formattedAuthor = formatAuthorName(book.author);
  
  // Extract publication year
  const year = extractYear(book);

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
          boxShadow: theme => theme.palette.mode === 'dark' 
            ? '0 20px 40px rgba(0,0,0,0.6)'
            : '0 20px 40px rgba(0,0,0,0.15)',
          '& img': {
            transform: 'scale(1.05)',
          }
        },
        '& img': {
          transition: 'transform 0.5s ease'
        }
      }}
    >
      {/* Full Cover Image */}
      <CardMedia
        component="img"
        image={optimizedCover || noImage}
        alt={book.title}
        sx={{
          height: '100%',
          flexGrow: 1,
          width: '100%',
          objectFit: 'cover',
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
            {Number(book.rating).toFixed(1)}
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
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)',
          color: 'white',
          p: 2,
          pt: 5, // Extra padding at top to account for gradient
          backdropFilter: 'blur(2px)',
          minHeight: '40%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end'
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
          {formattedAuthor}
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
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  fontSize: '0.7rem',
                  height: 24,
                  '& .MuiChip-label': {
                    px: 1,
                  },
                  backdropFilter: 'blur(4px)',
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Card>
  );
};

export default EnhancedBookCard;