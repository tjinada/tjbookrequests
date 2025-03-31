// src/components/library/BookmarkDrawer.js
import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Button
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import DeleteIcon from '@mui/icons-material/Delete';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CloseIcon from '@mui/icons-material/Close';

const BookmarkDrawer = ({ 
  open, 
  onClose, 
  bookmarks, 
  toc, 
  onBookmarkClick, 
  onTocClick,
  onAddBookmark, 
  onRemoveBookmark,
  currentLocation,
  bookTitle,
  bookAuthor,
  theme = 'light'
}) => {
  // Get theme-specific styles
  const getBackgroundColor = () => {
    if (theme === 'dark') return '#333';
    if (theme === 'sepia') return '#f5e6c8';
    return '#fff';
  };
  
  const getTextColor = () => {
    if (theme === 'dark') return '#ddd';
    return 'text.primary';
  };
  
  const getSecondaryColor = () => {
    if (theme === 'dark') return '#aaa';
    return 'text.secondary';
  };
  
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { 
          width: { xs: '80%', sm: 300 },
          bgcolor: getBackgroundColor(),
          color: getTextColor()
        }
      }}
    >
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        <Typography variant="h6">Contents & Bookmarks</Typography>
        <IconButton onClick={onClose} sx={{ color: getTextColor() }}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider sx={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'divider' }} />
      
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          {bookTitle || 'Book Reader'}
        </Typography>
        <Typography variant="body2" color={getSecondaryColor()} gutterBottom>
          {bookAuthor || 'Unknown Author'}
        </Typography>
      </Box>
      
      {/* Bookmarks section */}
      <Box sx={{ px: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 1 
        }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Bookmarks
          </Typography>
          
          <Button
            size="small"
            startIcon={<BookmarkAddIcon />}
            onClick={onAddBookmark}
            disabled={!currentLocation}
            sx={{ 
              color: theme === 'dark' ? '#fff' : undefined,
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.5)' : undefined,
              '&.Mui-disabled': {
                color: theme === 'dark' ? 'rgba(255,255,255,0.3)' : undefined,
              }
            }}
          >
            Add
          </Button>
        </Box>
        
        {bookmarks && bookmarks.length > 0 ? (
          <List dense>
            {bookmarks.map((bookmark, index) => (
              <ListItem 
                key={index}
                sx={{ 
                  py: 1, 
                  px: 1,
                  borderBottom: '1px solid',
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'divider',
                }}
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    size="small"
                    onClick={() => onRemoveBookmark(bookmark.cfi)}
                    sx={{ color: theme === 'dark' ? '#aaa' : undefined }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemIcon sx={{ minWidth: 36, color: theme === 'dark' ? '#80b3ff' : 'primary.main' }}>
                  <BookmarkIcon fontSize="small" />
                </ListItemIcon>
                
                <ListItemText 
                  primary={bookmark.title || 'Unnamed bookmark'}
                  primaryTypographyProps={{ 
                    noWrap: true,
                    variant: 'body2', 
                    sx: { cursor: 'pointer', color: getTextColor() },
                    onClick: () => onBookmarkClick(bookmark.cfi)
                  }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color={getSecondaryColor()} sx={{ ml: 1, mb: 2 }}>
            No bookmarks yet
          </Typography>
        )}
      </Box>
      
      <Divider sx={{ my: 2, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'divider' }} />
      
      {/* Table of Contents section */}
      {toc && toc.length > 0 && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            Table of Contents
          </Typography>
          
          <List dense>
            {toc.map((chapter, index) => (
              <ListItem 
                key={index}
                sx={{ 
                  py: 1, 
                  px: 1,
                  borderBottom: '1px solid',
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'divider',
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: theme === 'dark' ? '#aaa' : undefined }}>
                  <MenuBookIcon fontSize="small" />
                </ListItemIcon>
                
                <ListItemText 
                  primary={chapter.label}
                  primaryTypographyProps={{ 
                    noWrap: true,
                    variant: 'body2', 
                    sx: { cursor: 'pointer', color: getTextColor() },
                    onClick: () => onTocClick(chapter.href)
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Drawer>
  );
};

export default BookmarkDrawer;