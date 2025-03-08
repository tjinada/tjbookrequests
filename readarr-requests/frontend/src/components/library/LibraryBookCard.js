// src/components/library/LibraryBookCard.js
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import noImage from '../../assets/no-image.png';
import api from '../../utils/api';

// Format file size to human-readable
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const LibraryBookCard = ({ book, onClick }) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [isFavorite, setIsFavorite] = useState(book.isFavorite);
  const open = Boolean(menuAnchorEl);
  
  // Get the formatted date
  const formattedDate = book.addedAt 
    ? new Date(book.addedAt).toLocaleDateString() 
    : '';
  
  // Get the last read date
  const lastReadDate = book.lastReadAt 
    ? new Date(book.lastReadAt).toLocaleDateString() 
    : 'Never';
  
  // Format book format
  const bookFormat = book.fileFormat ? book.fileFormat.toUpperCase() : '';
  
  // Handle menu open
  const handleMenuClick = (event) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };
  
  // Handle menu close
  const handleMenuClose = (event) => {
    if (event) event.stopPropagation();
    setMenuAnchorEl(null);
  };
  
  // Handle favorite toggle
  const handleFavoriteToggle = async (event) => {
    event.stopPropagation();
    try {
      const newFavoriteStatus = !isFavorite;
      await api.put(`/library/${book._id}`, {
        isFavorite: newFavoriteStatus
      });
      setIsFavorite(newFavoriteStatus);
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };
  
  // Handle download
  const handleDownload = (event) => {
    event.stopPropagation();
    handleMenuClose();
    
    // Create a download link and click it
    window.open(`/api/library/${book._id}/download`, '_blank');
  };
  
  // Handle send to device
  const handleSendToDevice = (event) => {
    event.stopPropagation();
    handleMenuClose();
    // Navigate to send page - handled by parent component
    onClick();
  };
  
  // Handle read online
  const handleReadOnline = (event) => {
    event.stopPropagation();
    handleMenuClose();
    // Navigate to reader page - handled by parent component
    onClick();
  };

  return (
    <Card 
      sx={{ 
        display: 'flex', 
        height: '100%',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        }
      }}
      onClick={onClick}
    >
      {/* Left side - Book cover */}
      <Box sx={{ position: 'relative', width: 120 }}>
        <CardMedia
          component="img"
          sx={{ 
            width: 120, 
            height: '100%',
            objectFit: 'cover'
          }}
          image={book.cover || noImage}
          alt={book.title}
        />
        
        {/* Format badge */}
        {bookFormat && (
          <Chip
            label={bookFormat}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              fontSize: '0.7rem',
              height: 20
            }}
          />
        )}
        
        {/* Favorite button */}
        <IconButton
          sx={{
            position: 'absolute',
            bottom: 5,
            right: 5,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            },
            width: 30,
            height: 30
          }}
          onClick={handleFavoriteToggle}
        >
          {isFavorite ? (
            <FavoriteIcon fontSize="small" color="error" />
          ) : (
            <FavoriteBorderIcon fontSize="small" />
          )}
        </IconButton>
      </Box>
      
      {/* Right side - Book details */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        flexGrow: 1,
        position: 'relative'
      }}>
        <CardContent sx={{ flex: '1 0 auto', pb: 1 }}>
          <Typography component="div" variant="h6" sx={{ fontSize: '1rem' }}>
            {book.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {book.author}
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mt: 1,
            justifyContent: 'space-between'
          }}>
            <Typography variant="caption" color="text.secondary">
              Added: {formattedDate}
            </Typography>
            
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(book.fileSize)}
            </Typography>
          </Box>
          
          {book.lastReadAt && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Last read: {lastReadDate}
              </Typography>
            </Box>
          )}
        </CardContent>
        
        {/* Options menu */}
        <Box sx={{ 
          position: 'absolute',
          top: 5,
          right: 5
        }}>
          <IconButton
            aria-label="book options"
            aria-controls={open ? 'book-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleMenuClick}
            size="small"
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          
          <Menu
            id="book-menu"
            anchorEl={menuAnchorEl}
            open={open}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            PaperProps={{
              elevation: 3,
              sx: { minWidth: 180 }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleReadOnline}>
              <ListItemIcon>
                <MenuBookIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Read Online</ListItemText>
            </MenuItem>
            
            <MenuItem onClick={handleDownload}>
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Download</ListItemText>
            </MenuItem>
            
            <MenuItem onClick={handleSendToDevice}>
              <ListItemIcon>
                <SendIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Send to Device</ListItemText>
            </MenuItem>
            
            <MenuItem onClick={handleFavoriteToggle}>
              <ListItemIcon>
                {isFavorite ? (
                  <FavoriteIcon fontSize="small" color="error" />
                ) : (
                  <FavoriteBorderIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText>{isFavorite ? 'Unfavorite' : 'Favorite'}</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </Card>
  );
};

export default LibraryBookCard;