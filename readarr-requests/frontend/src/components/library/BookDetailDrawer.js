// src/components/library/BookDetailDrawer.js
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Chip,
  CircularProgress,
  useMediaQuery,
  Alert
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import LibraryContext from '../../context/LibraryContext';
import SendToDeviceDialog from './SendToDeviceDialog';

// Helper function to get icon for specific format
const getFormatIcon = (format) => {
  if (!format) return <DescriptionIcon />;
  
  const formatLower = format.toLowerCase();
  if (formatLower === 'pdf') return <PictureAsPdfIcon />;
  if (['epub', 'mobi', 'azw3', 'fb2'].includes(formatLower)) return <MenuBookIcon />;
  return <DescriptionIcon />;
};

const BookDetailDrawer = ({ book, open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { fetchBookFormats, downloadBook } = useContext(LibraryContext);
  
  // Local state
  const [tabValue, setTabValue] = useState(0);
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sendToDeviceOpen, setSendToDeviceOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  useEffect(() => {
    // Load book formats when drawer opens
    if (open && book?.id) {
      setLoading(true);
      fetchBookFormats(book.id)
        .then(formats => {
          setFormats(formats || []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching formats:', err);
          setError('Could not load book formats');
          setLoading(false);
        });
      
      // Check if book is bookmarked (from local storage)
      const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
      setIsBookmarked(bookmarks.some(id => id === book.id));
    }
  }, [open, book, fetchBookFormats]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleReadBook = (format = 'epub') => {
    onClose();
    navigate(`/read/${book.id}/${format}`);
  };
  
  const handleDownload = (format) => {
    downloadBook(book?.id, format);
  };
  
  const handleOpenSendDialog = () => {
    setSendToDeviceOpen(true);
  };
  
  const handleCloseSendDialog = () => {
    setSendToDeviceOpen(false);
  };
  
  const handleToggleBookmark = () => {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    
    if (isBookmarked) {
      // Remove bookmark
      const newBookmarks = bookmarks.filter(id => id !== book.id);
      localStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
    } else {
      // Add bookmark
      bookmarks.push(book.id);
      localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    }
    
    setIsBookmarked(!isBookmarked);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Render the info tab content
  const renderInfoTab = () => (
    <Box sx={{ p: 2 }}>
      {/* Book Cover (only show on mobile) */}
      {isMobile && book?.coverUrl && (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: 2 
          }}
        >
          <Box
            component="img"
            src={book.coverUrl}
            alt={book.title}
            sx={{
              maxWidth: '70%',
              maxHeight: 200,
              objectFit: 'contain',
              borderRadius: 1,
              boxShadow: theme.shadows[2]
            }}
          />
        </Box>
      )}
      
      <List disablePadding>
        {/* Title */}
        <ListItem sx={{ pl: 0 }}>
          <ListItemIcon>
            <MenuBookIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Title" 
            secondary={book?.title} 
            primaryTypographyProps={{
              variant: 'body2',
              color: 'text.secondary'
            }}
            secondaryTypographyProps={{
              variant: 'body1',
              fontWeight: 'medium'
            }}
          />
        </ListItem>
        
        {/* Author */}
        <ListItem sx={{ pl: 0 }}>
          <ListItemIcon>
            <PersonIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Author" 
            secondary={book?.author} 
            primaryTypographyProps={{
              variant: 'body2',
              color: 'text.secondary'
            }}
          />
        </ListItem>
        
        {/* Publisher */}
        {book?.publisher && (
          <ListItem sx={{ pl: 0 }}>
            <ListItemIcon>
              <BusinessIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Publisher" 
              secondary={book.publisher} 
              primaryTypographyProps={{
                variant: 'body2',
                color: 'text.secondary'
              }}
            />
          </ListItem>
        )}
        
        {/* Added Date */}
        {book?.added && (
          <ListItem sx={{ pl: 0 }}>
            <ListItemIcon>
              <AccessTimeIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Added to Library" 
              secondary={formatDate(book.added)} 
              primaryTypographyProps={{
                variant: 'body2',
                color: 'text.secondary'
              }}
            />
          </ListItem>
        )}
        
        {/* Format */}
        <ListItem sx={{ pl: 0 }}>
          <ListItemIcon>
            <LocalLibraryIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Available Formats" 
            secondary={
              formats.length > 0 
                ? formats.join(', ') 
                : 'Loading formats...'
            }
            primaryTypographyProps={{
              variant: 'body2',
              color: 'text.secondary'
            }}
          />
        </ListItem>
      </List>
      
      {/* Tags */}
      {book?.tags && book.tags.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Tags
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {book.tags.map((tag, index) => (
              <Chip 
                key={index} 
                label={tag} 
                size="small" 
                color="default"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}
      
      {/* Book Description */}
      {book?.description && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Description
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 1,
              color: 'text.secondary',
              whiteSpace: 'pre-line'
            }}
            dangerouslySetInnerHTML={{ __html: book.description }}
          />
        </Box>
      )}
    </Box>
  );
  
  // Render actions tab content
  const renderActionsTab = () => (
    <Box sx={{ p: 2 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : (
        <>
          {/* Read Now Button */}
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            startIcon={<MenuBookIcon />}
            onClick={() => handleReadBook(formats[0])}
            disabled={formats.length === 0}
            sx={{ mb: 2 }}
          >
            Read Now
          </Button>
          
          <Divider sx={{ my: 2 }}>
            <Chip label="Download Options" />
          </Divider>
          
          {/* Download Options */}
          <List>
            {formats.map((format) => (
              <ListItem key={format} disablePadding>
                <ListItemButton onClick={() => handleDownload(format)}>
                  <ListItemIcon>
                    {getFormatIcon(format)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Download ${format.toUpperCase()}`} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ my: 2 }}>
            <Chip label="More Actions" />
          </Divider>
          
          {/* Send to Device Button */}
          <Button
            variant="outlined"
            startIcon={<SendIcon />}
            fullWidth
            sx={{ mb: 2 }}
            onClick={handleOpenSendDialog}
            disabled={formats.length === 0}
          >
            Send to Device
          </Button>
          
          {/* Bookmark Button */}
          <Button
            variant="outlined"
            startIcon={isBookmarked ? <BookmarkAddedIcon /> : <BookmarkAddIcon />}
            color={isBookmarked ? "success" : "primary"}
            fullWidth
            sx={{ mb: 2 }}
            onClick={handleToggleBookmark}
          >
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          
          {/* Share Button */}
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            fullWidth
            sx={{ mb: 2 }}
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: book.title,
                  text: `Check out "${book.title}" by ${book.author}`,
                  url: window.location.href
                });
              } else {
                // Fallback - copy to clipboard
                navigator.clipboard.writeText(
                  `${book.title} by ${book.author} - ${window.location.href}`
                );
              }
            }}
          >
            Share
          </Button>
        </>
      )}
    </Box>
  );
  
  if (!book) return null;
  
  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { 
            width: { xs: '100%', sm: 400 },
            maxWidth: '100%'
          }
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%'
          }}
        >
          {/* Header with title and close button */}
          <Box 
            sx={{ 
              p: 2, 
              display: 'flex', 
              alignItems: 'center',
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {book.title}
            </Typography>
            <IconButton edge="end" onClick={onClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
          
          {/* Tabs */}
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<InfoOutlinedIcon />} label="Info" />
            <Tab icon={<DownloadIcon />} label="Actions" />
          </Tabs>
          
          {/* Tab Content */}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {tabValue === 0 && renderInfoTab()}
            {tabValue === 1 && renderActionsTab()}
          </Box>
        </Box>
      </Drawer>
      
      {/* Send to Device Dialog */}
      <SendToDeviceDialog
        open={sendToDeviceOpen}
        onClose={handleCloseSendDialog}
        book={book}
        formats={formats}
      />
    </>
  );
};

export default BookDetailDrawer;