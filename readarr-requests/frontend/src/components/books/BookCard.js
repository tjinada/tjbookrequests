// src/components/books/BookCard.js
// Update BookCard to be more touch-friendly
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import { useMediaQuery, useTheme } from '@mui/material';
import noImage from '../../assets/no-image.png';

const BookCard = ({ book, showRating = true }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleCardClick = () => {
    navigate(`/book/${book.id}`);
  };

  const truncate = (str, n) => {
    if (!str) return '';
    return str.length > n ? str.substr(0, n - 1) + '...' : str;
  };

  // Format the year from the release date
  const year = book.releaseDate 
    ? new Date(book.releaseDate).getFullYear() 
    : (book.year || 'Unknown year');

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s',
        '&:active': {
          transform: isMobile ? 'scale(0.98)' : 'none'
        }
      }}
    >
      <CardActionArea onClick={handleCardClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <CardMedia
          component="img"
          height={isMobile ? "160" : "240"}
          image={book.cover || noImage}
          alt={book.title}
          sx={{ objectFit: 'contain', p: 1 }}
        />
        <CardContent sx={{ flexGrow: 1, width: '100%' }}>
          <Typography gutterBottom variant="h6" component="div" sx={{ fontWeight: 'bold', fontSize: isMobile ? '0.9rem' : '1rem' }}>
            {truncate(book.title, isMobile ? 40 : 50)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
            {truncate(book.author, isMobile ? 30 : 40)}
          </Typography>

          {/* Rating display */}
          {showRating && book.rating > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Rating 
                value={book.rating} 
                readOnly 
                precision={0.1} 
                size="small" 
                sx={{ fontSize: isMobile ? '0.8rem' : '1rem' }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5, fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                {book.rating.toFixed(1)}
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
              {year}
            </Typography>
          </Box>

          {/* Request indicator */}
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: 8, 
              right: 8,
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 1
            }}
          >
            <BookmarkAddIcon fontSize="small" />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default BookCard;