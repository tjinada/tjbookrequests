// src/components/books/BookCard.js
import React from 'react';
import { Link } from 'react-router-dom';
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

const BookCard = ({ book, showEditionCount = false }) => {
  
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
      '&:hover': {
        transform: 'scale(1.03)'
      }
    }}>
      <CardMedia
        component="img"
        height="250"
        image={book.cover || noImage}
        alt={book.title}
        sx={{ objectFit: 'contain', p: 1 }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          {truncate(book.title, 40)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {book.author}
        </Typography>

        {/* Rating display */}
        {book.rating > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Rating 
              value={book.rating} 
              readOnly 
              precision={0.1} 
              size="small"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {book.rating.toFixed(1)}
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {year}
          </Typography>

          {showEditionCount && book.editions_count > 0 && (
            <Tooltip title="Number of editions">
              <Chip
                icon={<AutoStoriesIcon />}
                label={book.editions_count}
                size="small"
                variant="outlined"
              />
            </Tooltip>
          )}
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