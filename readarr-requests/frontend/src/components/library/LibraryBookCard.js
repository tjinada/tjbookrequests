// src/components/library/LibraryBookCard.js
import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Chip,
  Rating,
  IconButton,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import noImage from '../../assets/no-image.png';

// Styled card for better hover effects
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
    '& .card-actions': {
      opacity: 1
    }
  }
}));

// Badge showing available formats
const FormatBadge = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: 12,
  right: 12,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: theme.palette.common.white,
  fontWeight: 'bold',
  backdropFilter: 'blur(4px)',
  fontSize: '0.7rem',
  height: 24
}));

const LibraryBookCard = ({ book, onClick }) => {
  // Determine primary format to show
  const getPrimaryFormat = () => {
    if (!book.formats || book.formats.length === 0) return null;
    
    // Preferred format order: EPUB, PDF, MOBI, AZW, etc.
    const preferredFormats = ['EPUB', 'PDF', 'MOBI', 'AZW', 'TXT'];
    
    // Try to find the first preferred format that exists
    for (const format of preferredFormats) {
      const found = book.formats.find(f => 
        f.toUpperCase().endsWith(format.toUpperCase())
      );
      if (found) return format;
    }
    
    // If no preferred format found, return the first available
    return book.formats[0].split('.').pop().toUpperCase();
  };
  
  // Get format count
  const formatCount = book.formats ? book.formats.length : 0;
  const primaryFormat = getPrimaryFormat();
  
  // Get cover image URL or fallback
  const coverUrl = book.cover || noImage;
  
  // Get year from added date if available
  const getYear = () => {
    if (!book.added) return null;
    try {
      return new Date(book.added).getFullYear();
    } catch (e) {
      return null;
    }
  };
  
  // Stop event propagation for action buttons
  const handleActionClick = (e) => {
    e.stopPropagation();
  };
  
  return (
    <StyledCard onClick={onClick}>
      {/* Cover image */}
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          image={coverUrl}
          alt={book.title}
          sx={{ 
            height: 220,
            objectFit: 'cover',
            objectPosition: 'center top'
          }}
        />
        
        {/* Format badge */}
        {formatCount > 0 && (
          <FormatBadge
            label={formatCount > 1 ? `${primaryFormat} +${formatCount-1}` : primaryFormat}
            icon={<MenuBookIcon fontSize="small" />}
          />
        )}
        
        {/* Hover actions */}
        <Box
          className="card-actions"
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            display: 'flex',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            p: 1,
            bgcolor: 'rgba(0,0,0,0.6)',
            borderTopLeftRadius: 8,
            backdropFilter: 'blur(4px)'
          }}
        >
          <Tooltip title="View Details">
            <IconButton
              size="small"
              sx={{ color: 'white' }}
              onClick={handleActionClick}
            >
              <KeyboardArrowRightIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Book info */}
      <CardContent sx={{ flexGrow: 1, pt: 2 }}>
        <Typography 
          variant="h6" 
          component="h3" 
          gutterBottom
          sx={{ 
            fontSize: '1rem',
            fontWeight: 'bold',
            lineHeight: 1.2,
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {book.title}
        </Typography>
        
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {book.author}
        </Typography>
        
        {/* Rating if available */}
        {book.rating > 0 && (
          <Rating 
            value={book.rating} 
            precision={0.5} 
            size="small" 
            readOnly 
            sx={{ mb: 1 }}
          />
        )}
        
        {/* Tags */}
        {book.tags && book.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 'auto' }}>
            {book.tags
              .filter(tag => tag !== book.author) // Filter out author tags
              .slice(0, 3)
              .map((tag, idx) => (
                <Chip
                  key={`${tag}-${idx}`}
                  label={tag}
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              ))}
          </Box>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default LibraryBookCard;