// src/components/library/LibraryBookCard.js
import React from 'react';
import { styled } from '@mui/material/styles';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import noImage from '../../assets/no-image.png';

// Styled card with hover effect
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4]
  }
}));

const LibraryBookCard = ({ book, onClick }) => {
  // Process formats for display
  const formats = Array.isArray(book.formats) ? book.formats : [];
  
  return (
    <StyledCard onClick={onClick}>
      <Box sx={{ position: 'relative' }}>
        {/* Book Cover */}
        <CardMedia
          component="img"
          height="200"
          image={book.cover || noImage}
          alt={book.title}
          sx={{ 
            objectFit: 'contain',
            bgcolor: 'rgba(0,0,0,0.03)',
            p: 1
          }}
          imgProps={{
            crossOrigin: "anonymous"
          }}
        />
        
        {/* Available format badges */}
        {formats.length > 0 && (
          <Box 
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 0.5
            }}
          >
            {formats.slice(0, 2).map(format => (
              <Chip
                key={format}
                label={format}
                size="small"
                sx={{ 
                  fontSize: '0.7rem',
                  opacity: 0.9,
                  bgcolor: 'rgba(255,255,255,0.85)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.95)',
                  }
                }}
              />
            ))}
            
            {formats.length > 2 && (
              <Chip
                label={`+${formats.length - 2}`}
                size="small"
                sx={{ 
                  fontSize: '0.7rem',
                  opacity: 0.9,
                  bgcolor: 'rgba(255,255,255,0.85)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              />
            )}
          </Box>
        )}
        
        {/* Quick action buttons */}
        <Box 
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            p: 1,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            '.MuiCard-root:hover &': {
              opacity: 1
            }
          }}
        >
          <Tooltip title="Read">
            <IconButton 
              size="small" 
              sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.3)', mr: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                // Handle read action - this will be implemented in a more detailed component
              }}
            >
              <MenuBookIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Download">
            <IconButton 
              size="small" 
              sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}
              onClick={(e) => {
                e.stopPropagation();
                // Handle download action - this will be implemented in a more detailed component
              }}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography 
          variant="h6" 
          component="h2" 
          sx={{ 
            fontSize: '1rem', 
            fontWeight: 600,
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
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {book.author}
        </Typography>
      </CardContent>
    </StyledCard>
  );
};

export default LibraryBookCard;