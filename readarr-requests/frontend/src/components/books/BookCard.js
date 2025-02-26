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
import InfoIcon from '@mui/icons-material/Info';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import noImage from '../../assets/no-image.png'; // You'll need this file

const BookCard = ({ book }) => {
  const truncate = (str, n) => {
    return str?.length > n ? str.substr(0, n - 1) + '...' : str;
  };

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
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {book.releaseDate ? new Date(book.releaseDate).getFullYear() : 'Unknown year'}
          </Typography>
        </Box>
      </CardContent>
      <CardActions>
        <Button 
          size="small" 
          component={Link} 
          to={`/book/${book.id}`}
          startIcon={<InfoIcon />}
        >
          Details
        </Button>
        <Tooltip title="Request Book">
          <Button 
            size="small" 
            color="primary"
            component={Link}
            to={`/book/${book.id}`}
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