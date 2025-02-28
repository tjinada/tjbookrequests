// src/components/books/BookCard.js
import React from 'react';
import { Link, useNavigate  } from 'react-router-dom';
import { useMediaQuery, useTheme } from '@mui/material';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Rating from '@mui/material/Rating';
import InfoIcon from '@mui/icons-material/Info';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import Chip from '@mui/material/Chip';
import noImage from '../../assets/no-image.png';

const BookCard = ({ book, showRating = true }) => {

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleCardClick = () => {
    navigate(`/book/${book.id}`);
  };
  
  const getBookDetailUrl = (book) => {
    // If it's a Google Books source
    if (book.source === 'google') {
      // For Google Books IDs, remove the 'gb-' prefix
      const googleId = book.id.startsWith('gb-') ? book.id.substring(3) : book.id;
      return `/book/google/${googleId}`;
    }
  
    // For OpenLibrary books (default)
    return `/book/${book.id}`;
  };
  
  const truncate = (str, n) => {
    return str?.length > n ? str.substr(0, n - 1) + '...' : str;
  };

  // Format the year from the release date
  const year = book.releaseDate 
    ? new Date(book.releaseDate).getFullYear() 
    : (book.year || 'Unknown year');

  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      transition: 'transform 0.2s',
      '&:active': {
        transform: isMobile ? 'scale(0.98)' : 'none'
      }
    }}>
      <CardMedia
        component="img"
        height={isMobile ? "160" : "240"}
        image={book.cover || noImage}
        alt={book.title}
        sx={{ objectFit: 'contain', p: 1 }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
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

        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
            {year}
          </Typography>
        </Box>
      </CardContent>
      <CardActions>
        <Button 
          size="small" 
          component={Link} 
          to={getBookDetailUrl(book)}
          startIcon={<InfoIcon />}
        >
          Details
        </Button>
        <Tooltip title="Request Book">
          <Button 
            size="small" 
            color="primary"
            component={Link}
            to={getBookDetailUrl(book)}
            startIcon={<BookmarkAddIcon />}
          >
            Request
          </Button>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default BookCard;