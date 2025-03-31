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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import SettingsIcon from '@mui/icons-material/Settings';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';
import api from '../../utils/api';

// Import our components
import EpubReader from './EpubReader';
import BookmarkDrawer from './BookmarkDrawer';
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
  
  // Use reader settings hook
  const { 
    fontSize, 
    theme: readerTheme, 
    fontFamily,
    lineSpacing,
    margin,
    paginated,
    setFontSize,
    setTheme: setReaderTheme,
    setFontFamily,
    setLineSpacing,
    setMargin,
    setPaginated,
    resetSettings
  } = useReaderSettings();
  
  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  
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
  
  // Toggle settings dialog
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };
  
  // Toggle theme between light and dark
  const toggleTheme = () => {
    const newTheme = readerTheme === 'dark' ? 'light' : 'dark';
    setReaderTheme(newTheme);
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
        bgcolor: 'background.default'
      }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
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
        bgcolor: 'background.default'
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
      bgcolor: 'background.default',
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
        }}
        elevation={1}
      >
        <IconButton onClick={handleClose}>
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
            >
              {isBookmarked(currentLocation) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Contents & Bookmarks">
            <IconButton onClick={toggleDrawer}>
              <FormatListBulletedIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Theme">
            <IconButton onClick={toggleTheme}>
              {readerTheme === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Settings">
            <IconButton onClick={toggleSettings}>
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
          <Box sx={{ 
            height: '100%',
            bgcolor: readerTheme === 'dark' ? '#222' : 
                     readerTheme === 'sepia' ? '#FBF0D9' : '#fff' 
          }}>
            <EpubReader 
              url={getReaderUrl()} 
              fontSize={fontSize}
              theme={readerTheme}
              fontFamily={fontFamily}
              lineSpacing={lineSpacing}
              margin={margin}
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
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
      
      {/* Settings Dialog */}
      <Dialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: { 
            maxWidth: 400,
            width: '100%',
            bgcolor: readerTheme === 'dark' ? '#333' : 'background.paper',
            color: readerTheme === 'dark' ? '#fff' : 'text.primary',
          }
        }}
      >
        <DialogTitle>Reader Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Theme
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Button 
                variant={readerTheme === 'light' ? 'contained' : 'outlined'}
                onClick={() => setReaderTheme('light')}
                sx={{ flex: 1, mr: 1, color: readerTheme === 'dark' ? '#fff' : undefined }}
              >
                Light
              </Button>
              <Button 
                variant={readerTheme === 'sepia' ? 'contained' : 'outlined'}
                onClick={() => setReaderTheme('sepia')}
                sx={{ flex: 1, mx: 1, color: readerTheme === 'dark' ? '#fff' : undefined }}
              >
                Sepia
              </Button>
              <Button 
                variant={readerTheme === 'dark' ? 'contained' : 'outlined'}
                onClick={() => setReaderTheme('dark')}
                sx={{ flex: 1, ml: 1, color: readerTheme === 'dark' ? '#fff' : undefined }}
              >
                Dark
              </Button>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle2" gutterBottom id="font-size-slider">
              Font Size: {fontSize}%
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextDecreaseIcon sx={{ mr: 2 }} />
              <Slider
                value={fontSize}
                onChange={(e, value) => setFontSize(value)}
                min={50}
                max={200}
                step={10}
                aria-labelledby="font-size-slider"
              />
              <TextIncreaseIcon sx={{ ml: 2 }} />
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ my: 2 }}>
            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel id="font-family-label" sx={{ color: readerTheme === 'dark' ? '#fff' : undefined }}>Font Family</InputLabel>
              <Select
                labelId="font-family-label"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                label="Font Family"
                sx={{ color: readerTheme === 'dark' ? '#fff' : undefined }}
              >
                <MenuItem value="serif">Serif</MenuItem>
                <MenuItem value="sans-serif">Sans-serif</MenuItem>
                <MenuItem value="monospace">Monospace</MenuItem>
              </Select>
            </FormControl>
            
            <Typography variant="subtitle2" gutterBottom id="line-spacing-slider">
              Line Spacing: {lineSpacing}
            </Typography>
            <Slider
              value={lineSpacing}
              onChange={(e, value) => setLineSpacing(value)}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="line-spacing-slider"
            />
          </Box>
          
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={resetSettings} 
            sx={{ color: readerTheme === 'dark' ? '#fff' : undefined }}
          >
            Reset to Default
          </Button>
          <Button 
            onClick={() => setSettingsOpen(false)} 
            variant="contained"
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookReader;