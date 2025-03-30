// src/components/library/BookReader.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Alert,
  Button,
  Snackbar,
  useTheme
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import SettingsIcon from '@mui/icons-material/Settings';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import api from '../../utils/api';

// Import our components
import EpubReader from './EpubReader';
import BookmarkDrawer from './BookmarkDrawer';
import useBookmarks from '../../hooks/useBookmarks';

const BookReader = () => {
  const { id, format = 'epub' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  // State for reader
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [book, setBook] = useState(null);
  const [currentFormat, setCurrentFormat] = useState(format.toLowerCase());
  
  // Reader settings
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('reader_fontSize') || '100', 10);
  });
  
  // Set dark mode as default
  const [readerTheme, setReaderTheme] = useState(() => {
    const savedTheme = localStorage.getItem('reader_theme');
    return savedTheme || 'dark'; // Default to dark mode
  });
  
  // Table of contents and location tracking
  const [toc, setToc] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Use our bookmark hook
  const { 
    bookmarks,
    addBookmark, 
    removeBookmark, 
    isBookmarked 
  } = useBookmarks(id);
  
  // Notification for user feedback
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Rendition reference
  const renditionRef = useRef(null);
  
  // Load book data when component mounts
  useEffect(() => {
    if (!id) {
      setError('Book ID is required');
      setLoading(false);
      return;
    }
    
    // Function to load book data
    const loadBook = async () => {
      try {
        setLoading(true);
        
        // Get book details
        const bookResponse = await api.get(`/library/book/${id}`);
        setBook(bookResponse.data);
        
        // Load saved location if available
        const lastLocation = localStorage.getItem(`book_location_${id}`);
        if (lastLocation) {
          setCurrentLocation(lastLocation);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading book:', err);
        if (err.response && err.response.status === 401) {
          setError('Authentication required. Please sign in again.');
        } else {
          setError('Failed to load book information. Please try again.');
        }
        setLoading(false);
      }
    };
    
    loadBook();
  }, [id]);
  
  // Apply full-screen adjustments on component mount
  useEffect(() => {
    // Save original body background and color
    const originalBgColor = document.body.style.backgroundColor;
    const originalColor = document.body.style.color;
    const originalOverflow = document.body.style.overflow;
    
    // Apply full black background to body
    document.body.style.backgroundColor = readerTheme === 'dark' ? '#000000' : '#ffffff';
    document.body.style.color = readerTheme === 'dark' ? '#e8e8e8' : '#000000';
    document.body.style.overflow = 'hidden';
    
    // Cleanup on unmount
    return () => {
      document.body.style.backgroundColor = originalBgColor;
      document.body.style.color = originalColor;
      document.body.style.overflow = originalOverflow;
    };
  }, [readerTheme]);
  
  // Save theme preference whenever it changes
  useEffect(() => {
    localStorage.setItem('reader_theme', readerTheme);
    
    // Update body background when theme changes
    document.body.style.backgroundColor = readerTheme === 'dark' ? '#000000' : '#ffffff';
    document.body.style.color = readerTheme === 'dark' ? '#e8e8e8' : '#000000';
  }, [readerTheme]);
  
  // Handle location change from EPUB reader
  const handleLocationChanged = (newLocation) => {
    setCurrentLocation(newLocation);
    
    // Save current location to localStorage
    localStorage.setItem(`book_location_${id}`, newLocation);
  };
  
  // Handle TOC change from EPUB reader
  const handleTocChanged = (newToc) => {
    setToc(newToc || []);
  };
  
  // Set rendition reference from EPUB reader
  const handleRenditionReady = (rendition) => {
    renditionRef.current = rendition;
  };
  
  // Toggle bookmark drawer
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  // Toggle reader theme between light and dark
  const toggleTheme = () => {
    const newTheme = readerTheme === 'light' ? 'dark' : 'light';
    setReaderTheme(newTheme);
    showNotification(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode enabled`, 'info');
  };
  
  // Handle bookmark toggle
  const handleToggleBookmark = () => {
    if (!currentLocation) {
      showNotification('Cannot add bookmark at current location', 'warning');
      return;
    }
    
    if (isBookmarked(currentLocation)) {
      removeBookmark(currentLocation);
      showNotification('Bookmark removed', 'info');
    } else {
      // Try to get chapter title if possible
      let title = 'Unnamed bookmark';
      
      if (renditionRef.current) {
        try {
          // Try to get the current chapter title
          const location = renditionRef.current.currentLocation();
          if (location && location.start) {
            const href = location.start.href;
            
            // Try to find the chapter in TOC
            const chapter = toc.find(item => 
              item.href.includes(href.split('#')[0])
            );
            if (chapter) {
              title = chapter.label || title;
            }
          }
        } catch (e) {
          console.error('Error getting chapter title:', e);
        }
      }
      
      addBookmark(currentLocation, title);
      showNotification('Bookmark added', 'success');
    }
  };
  
  // Handle adding a bookmark from the drawer
  const handleAddBookmark = () => {
    handleToggleBookmark();
  };
  
  // Go to bookmark location
  const handleBookmarkClick = (cfi) => {
    if (renditionRef.current && cfi) {
      renditionRef.current.display(cfi);
      setDrawerOpen(false); // Close drawer after navigation
    }
  };
  
  // Go to TOC location
  const handleTocClick = (href) => {
    if (renditionRef.current && href) {
      renditionRef.current.display(href);
      setDrawerOpen(false); // Close drawer after navigation
    }
  };
  
  // Show notification
  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // Close reader and go back
  const handleClose = () => {
    navigate('/library');
  };
  
  // Get URL for reader
  const getReaderUrl = () => {
    return `/library/reading/${id}/${currentFormat}`;
  };
  
  // Determine if dark mode is active
  const isDarkMode = readerTheme === 'dark';
  
  // Render loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        width: '100vw',
        bgcolor: isDarkMode ? '#000000' : '#ffffff',
        color: isDarkMode ? '#e8e8e8' : 'text.primary',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <CircularProgress color={isDarkMode ? 'secondary' : 'primary'} />
        <Typography 
          variant="body1" 
          sx={{ 
            mt: 2,
            color: isDarkMode ? '#e8e8e8' : 'text.primary'
          }}
        >
          Loading book...
        </Typography>
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Box sx={{ 
        p: 3,
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        height: '100vh',
        width: '100vw',
        bgcolor: isDarkMode ? '#000000' : '#ffffff',
        color: isDarkMode ? '#e8e8e8' : 'text.primary',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <Alert 
          severity="error" 
          sx={{ width: '100%', maxWidth: 500, mb: 2 }}
          action={
            <IconButton color="inherit" size="small" onClick={handleClose}>
              <ArrowBackIcon />
            </IconButton>
          }
        >
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={handleClose} 
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 3 }}
        >
          Return to Library
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ 
      height: '100vh', 
      width: '100vw',
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: isDarkMode ? '#000000' : '#ffffff',
      color: isDarkMode ? '#e8e8e8' : 'text.primary',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      {/* Reader header */}
      <Paper 
        sx={{ 
          px: 2, 
          py: 1, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: 0,
          zIndex: 1,
          bgcolor: isDarkMode ? '#000000' : '#ffffff',
          color: isDarkMode ? '#e8e8e8' : 'text.primary',
          borderBottom: isDarkMode ? '1px solid #333' : '1px solid #ddd'
        }}
        elevation={1}
      >
        <IconButton 
          onClick={handleClose}
          sx={{ color: isDarkMode ? '#e8e8e8' : undefined }}
        >
          <ArrowBackIcon />
        </IconButton>
        
        <Typography 
          variant="subtitle1" 
          component="div" 
          sx={{ 
            fontWeight: 'medium',
            textAlign: 'center',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {book?.title || 'Book Reader'}
        </Typography>
        
        <Box>
          <Tooltip title={isBookmarked(currentLocation) ? "Remove bookmark" : "Add bookmark"}>
            <IconButton 
              onClick={handleToggleBookmark}
              color={isBookmarked(currentLocation) ? 'primary' : 'default'}
              sx={{ color: !isBookmarked(currentLocation) && isDarkMode ? '#e8e8e8' : undefined }}
            >
              {isBookmarked(currentLocation) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Contents & Bookmarks">
            <IconButton 
              onClick={toggleDrawer}
              sx={{ color: isDarkMode ? '#e8e8e8' : undefined }}
            >
              <FormatListBulletedIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <IconButton 
              onClick={toggleTheme}
              sx={{ color: isDarkMode ? '#e8e8e8' : undefined }}
            >
              {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      
      {/* Reader content area */}
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'hidden',
          position: 'relative',
          bgcolor: isDarkMode ? '#000000' : '#ffffff',
          margin: 0,
          padding: 0
        }}
      >
        {/* EPUB Reader */}
        {currentFormat === 'epub' && (
          <Box sx={{ height: '100%', width: '100%' }}>
            <EpubReader 
              url={getReaderUrl()} 
              fontSize={fontSize}
              theme={readerTheme}
              locationChanged={handleLocationChanged}
              tocChanged={handleTocChanged}
              getRendition={handleRenditionReady}
              initialLocation={currentLocation}
            />
          </Box>
        )}
      </Box>
      
      {/* Bookmark and TOC Drawer */}
      <BookmarkDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        bookmarks={bookmarks}
        toc={toc}
        onBookmarkClick={handleBookmarkClick}
        onTocClick={handleTocClick}
        onAddBookmark={handleAddBookmark}
        onRemoveBookmark={removeBookmark}
        currentLocation={currentLocation}
        bookTitle={book?.title}
        bookAuthor={book?.author}
        theme={readerTheme}
      />
      
      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ 
            width: '100%',
            bgcolor: isDarkMode ? 'rgba(0,0,0,0.9)' : undefined,
            color: isDarkMode ? '#fff' : undefined,
            '& .MuiAlert-icon': {
              color: isDarkMode ? '#fff' : undefined
            }
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BookReader;