// src/components/books/ImprovedBookCard.js
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Badge from '@mui/material/Badge';
import StarIcon from '@mui/icons-material/Star';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { styled } from '@mui/material/styles';
import noImage from '../../assets/no-image.png';
import AuthContext from '../../context/AuthContext';
import api from '../../utils/api';

// Styled card component for consistent hover effects
const StyledCard = styled(Card)(({ theme }) => ({
  display: 'flex',
  height: '100%',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4]
  }
}));

const ImprovedBookCard = ({ book, onClick }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  const [isRequested, setIsRequested] = useState(false);
  
  // Get the best available cover image
  const bookCover = book.cover || noImage;
  
  // Extract year from releaseDate or use provided year
  const year = book.year || (book.releaseDate ? new Date(book.releaseDate).getFullYear() : null);

  // Check if the book has been requested by the user
  useEffect(() => {
    if (isAuthenticated && book.id) {
      // Fetch user's requests to check if this book is among them
      const checkIfRequested = async () => {
        try {
          const response = await api.get('/requests/me');
          const requests = response.data;
          
          // Check if this book ID exists in the user's requests
          const bookRequested = requests.some(request => request.bookId === book.id);
          setIsRequested(bookRequested);
        } catch (error) {
          console.error('Error checking if book is requested:', error);
        }
      };
      
      checkIfRequested();
    }
  }, [isAuthenticated, book.id]);
  
  // Handle book click - Navigate to details page or use custom handler
  const handleBookClick = () => {
    if (onClick) {
      onClick(book);
    } else {
      navigate(`/book/${book.id}`);
    }
  };

  return (
    <StyledCard onClick={handleBookClick}>
      {/* Book Cover on the left */}
      <Box sx={{ position: 'relative', minWidth: 100 }}>
        <CardMedia
          component="img"
          sx={{ 
            width: 100,
            minWidth: 100, 
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top'
          }}
          image={bookCover}
          alt={book.title}
        />
        
        {/* Show requested badge if applicable */}
        {isRequested && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 5,
              right: 5,
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 16, color: 'white' }} />
          </Box>
        )}
      </Box>
      
      {/* Book Details on the right */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%' 
      }}>
        <CardContent sx={{ flex: '1 0 auto', py: 1.5 }}>
          {/* Title and rating */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography 
              component="h2" 
              variant="h6" 
              sx={{ 
                fontWeight: 'bold', 
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                fontSize: '1rem',
                lineHeight: 1.2,
                maxWidth: '80%'
              }}
            >
              {book.title}
            </Typography>
            
            {book.rating > 0 && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                bgcolor: 'rgba(0,0,0,0.05)', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1,
                ml: 1,
                minWidth: 50,
                justifyContent: 'center'
              }}>
                <StarIcon sx={{ color: '#FFD700', fontSize: '0.9rem', mr: 0.5 }} />
                <Typography variant="body2" fontWeight="bold">
                  {typeof book.rating === 'number' ? book.rating.toFixed(1) : '5.0'}
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Author */}
          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {book.author}
          </Typography>
          
          {/* Year with icon */}
          {year && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: '0.9rem', mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {year}
              </Typography>
            </Box>
          )}
          
          {/* Genres/Categories */}
          {book.genres && book.genres.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 'auto', pt: 1 }}>
              {book.genres.slice(0, 3).map((genre, index) => (
                <Chip
                  key={`${genre}-${index}`}
                  label={genre}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.7rem'
                  }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Box>
    </StyledCard>
  );
};

export default ImprovedBookCard;