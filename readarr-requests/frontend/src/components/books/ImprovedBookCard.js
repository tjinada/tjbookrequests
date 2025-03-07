// src/components/books/ImprovedBookCard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import StarIcon from '@mui/icons-material/Star';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import { styled } from '@mui/material/styles';
import noImage from '../../assets/no-image.png';

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
  
  // Get the best available cover image
  const bookCover = book.cover || noImage;
  
  // Extract year from releaseDate or use provided year
  const year = book.year || (book.releaseDate ? new Date(book.releaseDate).getFullYear() : null);
  
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