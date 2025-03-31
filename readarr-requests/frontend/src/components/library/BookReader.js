// src/components/reader/BookReader.js
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
  Snackbar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import SettingsIcon from '@mui/icons-material/Settings';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import api from '../../utils/api';

// Import our components
import EpubReader from '../library/EpubReader';
import PdfReader from '../library/PdfReader';
import BookmarkDrawer from '../library/BookmarkDrawer';
import ReaderSettingsDrawer from '../library/ReaderSettingsDrawer';
import useBookmarks from '../../hooks/useBookmarks';
import useReaderSettings from '../../hooks/useReaderSettings';

const BookReader = () => {
  const { id, format = 'epub' } = useParams();
  const navigate = useNavigate();
  
  // State for reader
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [book, setBook] = useState(null);
  const [currentFormat, setCurrentFormat] = useState(format.toLowerCase());
  
  // Use our custom hooks for reader settings and bookmarks
  const { 
    bookmarks,
    addBookmark, 
    removeBookmark, 
    isBookmarked 
  } = useBookmarks(id);
  
  const {
    fontSize,
    theme,
    fontFamily,
    lineSpacing,
    paginated,
    margin,
    setFontSize,
    setTheme,
    setFontFamily,
    setLineSpacing,
    setPaginated,
    setMargin,
    resetSettings
  } = useReaderSettings();
  
  // Table of contents and location tracking
  const [toc, setToc] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [bookmarkDrawerOpen, setBookmarkDrawerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  
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
  
  // Handle location change from reader
  const handleLocationChanged = (newLocation) => {
    setCurrentLocation(newLocation);
    
    // Save current location to localStorage
    localStorage.setItem(`book_location_${id}`, newLocation);
  };
  
  // Handle TOC change from reader
  const handleTocChanged = (newToc) => {
    setToc(newToc || []);
  };
  
  // Set rendition reference from reader
  const handleRenditionReady = (rendition) => {
    renditionRef.current = rendition;
  };
  
  // Toggle bookmark drawer
  const toggleBookmarkDrawer = () => {
    setBookmarkDrawerOpen(!bookmarkDrawerOpen);
    if (settingsDrawerOpen) setSettingsDrawerOpen(false);
  };
  
  // Toggle settings drawer
  const toggleSettingsDrawer = () => {
    setSettingsDrawerOpen(!settingsDrawerOpen);
    if (bookmarkDrawerOpen) setBookmarkDrawerOpen(false);
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
      setBookmarkDrawerOpen(false); // Close drawer after navigation
    }
  };
  
  // Go to TOC location
  const handleTocClick = (href) => {
    if (renditionRef.current && href) {
      renditionRef.current.display(href);
      setBookmarkDrawerOpen(false); // Close drawer after navigation
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
    return `/api/library/reading/${id}/${currentFormat}`;
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: theme === 'dark' ? '#222' : theme === 'sepia' ? '#FBF0D9' : 'background.default'
      }}>
        <CircularProgress />
        <Typography 
          variant="body1" 
          sx={{ 
            mt: 2,
            color: theme === 'dark' ? '#ccc' : theme === 'sepia' ? '#5B4636' : 'text.primary'
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
        bgcolor: theme === 'dark' ? '#222' : theme === 'sepia' ? '#FBF0D9' : 'background.default'
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
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: theme === 'dark' ? '#222' : theme === 'sepia' ? '#FBF0D9' : 'background.default',
      overflow: 'hidden'
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
          bgcolor: theme === 'dark' ? '#333' : theme === 'sepia' ? '#E8DCBF' : 'background.paper',
          color: theme === 'dark' ? '#fff' : theme === 'sepia' ? '#5B4636' : 'text.primary',
        }}
        elevation={1}
      >
        <IconButton 
          onClick={handleClose}
          sx={{ color: theme === 'dark' ? '#fff' : theme === 'sepia' ? '#5B4636' : undefined }}
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
              sx={{ color: !isBookmarked(currentLocation) && theme === 'dark' ? '#fff' : theme === 'sepia' && !isBookmarked(currentLocation) ? '#5B4636' : undefined }}
            >
              {isBookmarked(currentLocation) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Contents & Bookmarks">
            <IconButton 
              onClick={toggleBookmarkDrawer}
              sx={{ color: theme === 'dark' ? '#fff' : theme === 'sepia' ? '#5B4636' : undefined }}
            >
              <FormatListBulletedIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Settings">
            <IconButton 
              onClick={toggleSettingsDrawer}
              sx={{ color: theme === 'dark' ? '#fff' : theme === 'sepia' ? '#5B4636' : undefined }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      
      {/* Reader content area */}
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* EPUB Reader */}
        {currentFormat === 'epub' && (
          <Box sx={{ height: '100%' }}>
            <EpubReader 
              url={getReaderUrl()} 
              fontSize={fontSize}
              theme={theme}
              initialLocation={currentLocation}
              locationChanged={handleLocationChanged}
              tocChanged={handleTocChanged}
              getRendition={handleRenditionReady}
            />
          </Box>
        )}
        
        {/* PDF Reader */}
        {currentFormat === 'pdf' && (
          <Box sx={{ height: '100%' }}>
            <PdfReader url={getReaderUrl()} initialScale={fontSize / 100} />
          </Box>
        )}
      </Box>
      
      {/* Bookmark and TOC Drawer */}
      <BookmarkDrawer
        open={bookmarkDrawerOpen}
        onClose={() => setBookmarkDrawerOpen(false)}
        bookmarks={bookmarks}
        toc={toc}
        onBookmarkClick={handleBookmarkClick}
        onTocClick={handleTocClick}
        onAddBookmark={handleAddBookmark}
        onRemoveBookmark={removeBookmark}
        currentLocation={currentLocation}
        bookTitle={book?.title}
        bookAuthor={book?.author}
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
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
      
      {/* Settings Drawer */}
      <ReaderSettingsDrawer
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        theme={theme}
        onThemeChange={setTheme}
        paginated={paginated}
        onPaginatedChange={setPaginated}
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
        lineSpacing={lineSpacing}
        onLineSpacingChange={setLineSpacing}
        margin={margin}
        onMarginChange={setMargin}
        onResetSettings={resetSettings}
      />
    </Box>
  );
};

export default BookReader;