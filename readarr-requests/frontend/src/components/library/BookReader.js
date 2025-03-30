// src/components/library/BookReader.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Paper,
  Slider,
  Tooltip,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme,
  useMediaQuery,
  Button,
  Snackbar
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import BrightnessHighIcon from '@mui/icons-material/BrightnessHigh';
import BrightnessLowIcon from '@mui/icons-material/BrightnessLow';
import SettingsIcon from '@mui/icons-material/Settings';
import DownloadIcon from '@mui/icons-material/Download';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

import api from '../../utils/api';
import ReaderControls from '../reader/ReaderControls';

// Import the specialized reader components
import EpubReader from './EpubReader';
import PdfReader from './PdfReader';

const BookReader = () => {
  const { id, format = 'epub' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for reader
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [book, setBook] = useState(null);
  const [availableFormats, setAvailableFormats] = useState([]);
  const [currentFormat, setCurrentFormat] = useState(format.toLowerCase());
  
  // Reader settings
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('reader_fontSize') || '100', 10);
  });
  const [readerTheme, setReaderTheme] = useState(() => {
    return localStorage.getItem('reader_theme') || 'light';
  });
  const [brightness, setBrightness] = useState(() => {
    return parseInt(localStorage.getItem('reader_brightness') || '100', 10);
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // TOC and bookmarks
  const [tocOpen, setTocOpen] = useState(false);
  const [toc, setToc] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Content frame reference
  const readerContainerRef = useRef(null);
  const renditionRef = useRef(null);
  
  // Load book data and bookmarks when component mounts
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
        
        // Get available formats
        const formatsResponse = await api.get(`/library/formats/${id}`);
        setAvailableFormats(formatsResponse.data.formats || []);
        
        // Set current format if available, otherwise use the first available format
        if (formatsResponse.data.formats && formatsResponse.data.formats.length > 0) {
          const lowerFormat = format.toLowerCase();
          if (formatsResponse.data.formats.some(fmt => fmt.toLowerCase() === lowerFormat)) {
            setCurrentFormat(lowerFormat);
          } else {
            setCurrentFormat(formatsResponse.data.formats[0].toLowerCase());
          }
        }
        
        // Load saved bookmarks
        loadBookmarks();
        
        // Load last location
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
    
    // Apply saved display settings
    applyReaderSettings();
    
    // Cleanup on unmount
    return () => {
      // Save settings on unmount
      saveReaderSettings();
    };
  }, [id, format, navigate]);
  
  // Load bookmarks from localStorage
  const loadBookmarks = () => {
    try {
      const savedBookmarks = localStorage.getItem(`bookmarks_${id}`);
      if (savedBookmarks) {
        setBookmarks(JSON.parse(savedBookmarks));
      }
    } catch (err) {
      console.error('Error loading bookmarks:', err);
      // If there's an error, reset bookmarks
      setBookmarks([]);
    }
  };
  
  // Save bookmarks to localStorage
  const saveBookmarks = (newBookmarks) => {
    try {
      localStorage.setItem(`bookmarks_${id}`, JSON.stringify(newBookmarks));
      setBookmarks(newBookmarks);
    } catch (err) {
      console.error('Error saving bookmarks:', err);
      showNotification('Failed to save bookmark', 'error');
    }
  };
  
  // Apply saved reader settings
  const applyReaderSettings = () => {
    // Apply brightness to reader container
    if (readerContainerRef.current) {
      readerContainerRef.current.style.filter = `brightness(${brightness}%)`;
    }
  };
  
  // Save reader settings
  const saveReaderSettings = () => {
    localStorage.setItem('reader_fontSize', fontSize.toString());
    localStorage.setItem('reader_theme', readerTheme);
    localStorage.setItem('reader_brightness', brightness.toString());
  };
  
  // Handle location change (from EPUB reader)
  const handleLocationChanged = (newLocation) => {
    setCurrentLocation(newLocation);
    
    // Save current location to localStorage
    localStorage.setItem(`book_location_${id}`, newLocation);
    
    // Update page number if rendition is available
    if (renditionRef.current && renditionRef.current.location) {
      try {
        const location = renditionRef.current.location;
        if (location.start) {
          if (location.start.displayed) {
            setCurrentPage(location.start.displayed.page);
            setTotalPages(location.start.displayed.total);
          } else if (location.start.percentage) {
            // Approximate page numbers when actual pages aren't available
            setCurrentPage(Math.ceil(location.start.percentage * 100));
            setTotalPages(100);
          }
        }
      } catch (err) {
        console.error('Error updating page numbers:', err);
      }
    }
  };
  
  // Get TOC from EPUB reader
  const handleTocChanged = (newToc) => {
    setToc(newToc || []);
  };
  
  // Handle rendition reference from EPUB reader
  const handleRenditionReady = (rendition) => {
    renditionRef.current = rendition;
    
    // Set up keyboard navigation
    rendition.on('keyup', (event) => {
      if (event.key === 'ArrowLeft') {
        rendition.prev();
      } else if (event.key === 'ArrowRight') {
        rendition.next();
      }
    });
  };
  
  // Handle page navigation
  const handlePrevPage = () => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  };
  
  const handleNextPage = () => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  };
  
  // Change book format
  const changeFormat = (newFormat) => {
    if (newFormat === currentFormat) return;
    
    setCurrentFormat(newFormat);
    navigate(`/read/${id}/${newFormat}`);
  };
  
  // Toggle settings drawer
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };
  
  // Toggle TOC/bookmarks drawer
  const toggleToc = () => {
    setTocOpen(!tocOpen);
  };
  
  // Close reader and go back
  const handleClose = () => {
    navigate('/library');
  };
  
  // Update font size
  const handleFontSizeChange = (event, newValue) => {
    setFontSize(newValue);
  };
  
  // Update brightness
  const handleBrightnessChange = (event, newValue) => {
    setBrightness(newValue);
    
    // Apply brightness to reader container
    if (readerContainerRef.current) {
      readerContainerRef.current.style.filter = `brightness(${newValue}%)`;
    }
  };
  
  // Toggle reader theme
  const toggleReaderTheme = () => {
    const newTheme = readerTheme === 'light' ? 'dark' : 'light';
    setReaderTheme(newTheme);
  };
  
  // Handle direct download
  const handleDownload = () => {
    // Create the download URL
    const downloadUrl = `/api/library/download/${id}/${currentFormat}`;
    
    // Use the api utility to get authenticated download
    api({
      url: downloadUrl,
      method: 'GET',
      responseType: 'blob',
      headers: {
        'x-auth-token': localStorage.getItem('token')
      }
    })
    .then(response => {
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename from Content-Disposition header if available
      const contentDisposition = response.headers['content-disposition'];
      let filename = `book.${currentFormat}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      } else if (book && book.title) {
        // Use book title as filename
        filename = `${book.title.replace(/[/\\?%*:|"<>]/g, '_')}.${currentFormat}`;
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    })
    .catch(error => {
      console.error('Error downloading book:', error);
      showNotification('Failed to download the book. Please try again.', 'error');
    });
  };
  
  // Go to specific location in the book
  const goToLocation = (cfi) => {
    if (renditionRef.current && cfi) {
      renditionRef.current.display(cfi);
      if (isMobile) {
        setTocOpen(false);
      }
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
  
  // Add bookmark at current location
  const addBookmark = () => {
    if (!currentLocation) {
      showNotification('Cannot add bookmark at this location', 'warning');
      return;
    }
    
    // Get chapter title if possible
    let title = 'Unnamed bookmark';
    
    if (renditionRef.current) {
      try {
        // Try to get the current chapter title
        const location = renditionRef.current.currentLocation();
        if (location && location.start) {
          const href = location.start.href;
          
          // Try to find the chapter in TOC
          const chapter = toc.find(item => item.href.includes(href.split('#')[0]));
          if (chapter) {
            title = chapter.label || title;
          }
        }
      } catch (e) {
        console.error('Error getting current chapter:', e);
      }
    }
    
    // Check if this location is already bookmarked
    if (bookmarks.some(b => b.cfi === currentLocation)) {
      // Remove the bookmark if it already exists
      const updatedBookmarks = bookmarks.filter(b => b.cfi !== currentLocation);
      saveBookmarks(updatedBookmarks);
      showNotification('Bookmark removed', 'info');
      return;
    }
    
    // Create new bookmark
    const newBookmark = {
      cfi: currentLocation,
      title,
      timestamp: new Date().toISOString()
    };
    
    const updatedBookmarks = [...bookmarks, newBookmark];
    saveBookmarks(updatedBookmarks);
    
    showNotification('Bookmark added', 'success');
  };
  
  // Remove bookmark
  const removeBookmark = (cfi) => {
    const updatedBookmarks = bookmarks.filter(b => b.cfi !== cfi);
    saveBookmarks(updatedBookmarks);
    
    showNotification('Bookmark removed', 'info');
  };
  
  // Check if current location is bookmarked
  const isCurrentLocationBookmarked = () => {
    return bookmarks.some(b => b.cfi === currentLocation);
  };
  
  // Get URL for reader - ensure it's the full API path
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
        bgcolor: 'background.default'
      }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading book information...
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
          <Tooltip title={isCurrentLocationBookmarked() ? "Remove bookmark" : "Add bookmark"}>
            <IconButton 
              onClick={addBookmark}
              color={isCurrentLocationBookmarked() ? 'primary' : 'default'}
            >
              {isCurrentLocationBookmarked() ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Table of contents & Bookmarks">
            <IconButton onClick={toggleToc}>
              <FormatListBulletedIcon />
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
        ref={readerContainerRef}
        sx={{ 
          flex: 1, 
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
      >
        {/* EPUB Reader */}
        {currentFormat === 'epub' && (
          <Box sx={{ height: '100%', position: 'relative' }}>
            <EpubReader 
              url={getReaderUrl()} 
              fontSize={fontSize}
              theme={readerTheme}
              locationChanged={handleLocationChanged}
              tocChanged={handleTocChanged}
              getRendition={handleRenditionReady}
              initialLocation={currentLocation}
            />
            
            {/* Page navigation controls */}
            <ReaderControls 
              onPrev={handlePrevPage}
              onNext={handleNextPage}
              currentPage={currentPage}
              totalPages={totalPages}
              theme={readerTheme}
            />
          </Box>
        )}
        
        {/* PDF Reader */}
        {currentFormat === 'pdf' && (
          <Box sx={{ height: '100%' }}>
            <PdfReader 
              url={getReaderUrl()} 
              initialScale={fontSize / 100}
            />
          </Box>
        )}
        
        {/* Fallback for other formats */}
        {currentFormat !== 'epub' && currentFormat !== 'pdf' && (
          <Box sx={{ 
            height: '100%', 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3
          }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              The format {currentFormat.toUpperCase()} cannot be viewed directly in the browser.
            </Alert>
            <Typography variant="body1" paragraph>
              Please download the book to view it in an external reader application.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Download {currentFormat.toUpperCase()}
            </Button>
          </Box>
        )}
      </Box>
      
      {/* Settings drawer */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: { width: { xs: '80%', sm: 300 } }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Reader Settings
          </Typography>
          
          <Divider sx={{ mb: 2 }} />
          
          <Typography id="font-size-slider" gutterBottom>
            Font Size
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <ZoomOutIcon sx={{ mr: 2 }} />
            <Slider
              value={fontSize}
              onChange={handleFontSizeChange}
              aria-labelledby="font-size-slider"
              min={50}
              max={200}
              step={10}
              valueLabelDisplay="auto"
              valueLabelFormat={value => `${value}%`}
            />
            <ZoomInIcon sx={{ ml: 2 }} />
          </Box>
          
          <Typography id="brightness-slider" gutterBottom>
            Brightness
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <BrightnessLowIcon sx={{ mr: 2 }} />
            <Slider
              value={brightness}
              onChange={handleBrightnessChange}
              aria-labelledby="brightness-slider"
              min={30}
              max={100}
              valueLabelDisplay="auto"
              valueLabelFormat={value => `${value}%`}
            />
            <BrightnessHighIcon sx={{ ml: 2 }} />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Theme</Typography>
            <Button 
              variant="outlined" 
              fullWidth 
              onClick={toggleReaderTheme}
              startIcon={readerTheme === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            >
              {readerTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            </Button>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Available Formats
          </Typography>
          <List dense>
            {availableFormats.map(fmt => (
              <ListItem 
                key={fmt}
                button
                selected={fmt.toLowerCase() === currentFormat.toLowerCase()}
                onClick={() => changeFormat(fmt.toLowerCase())}
              >
                <ListItemText 
                  primary={fmt} 
                  secondary={fmt.toLowerCase() === currentFormat.toLowerCase() ? 'Current' : null}
                />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />}
              fullWidth
              onClick={handleDownload}
            >
              Download {currentFormat.toUpperCase()}
            </Button>
          </Box>
        </Box>
      </Drawer>
      
      {/* TOC and Bookmarks drawer */}
      <Drawer
        anchor="left"
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        PaperProps={{
          sx: { width: { xs: '80%', sm: 300 } }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {book?.title || 'Book Reader'}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {book?.author || 'Unknown Author'}
          </Typography>
          
          {/* Bookmarks */}
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 'bold' }}>
            Bookmarks
          </Typography>
          {bookmarks.length > 0 ? (
            <Box 
              component="ul" 
              sx={{ 
                listStyle: 'none', 
                p: 0, 
                m: 0,
                maxHeight: '30vh',
                overflow: 'auto'
              }}
            >
              {bookmarks.map((bookmark, index) => (
                <Box 
                  component="li" 
                  key={index}
                  sx={{ 
                    py: 0.5, 
                    px: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      cursor: 'pointer',
                      flex: 1,
                      overflow: 'hidden'
                    }}
                    onClick={() => goToLocation(bookmark.cfi)}
                  >
                    <BookmarkIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2" noWrap>
                      {bookmark.title || 'Unnamed bookmark'}
                    </Typography>
                  </Box>
                  <IconButton 
                    size="small"
                    onClick={() => removeBookmark(bookmark.cfi)}
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                No bookmarks yet
              </Typography>
              <Button
                size="small"
                startIcon={<BookmarkAddIcon />}
                onClick={addBookmark}
                variant="outlined"
              >
                Add
              </Button>
            </Box>
          )}
          
          {/* Table of Contents */}
          {toc && toc.length > 0 && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 'bold' }}>
                Table of Contents
              </Typography>
              <Box 
                component="ul" 
                sx={{ 
                  listStyle: 'none', 
                  p: 0, 
                  m: 0,
                  maxHeight: '40vh',
                  overflow: 'auto'
                }}
              >
                {toc.map((chapter, index) => (
                  <Box 
                    component="li" 
                    key={index}
                    sx={{ 
                      py: 0.5, 
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => goToLocation(chapter.href)}
                  >
                    <Typography variant="body2">
                      {chapter.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      </Drawer>
      
      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
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
    </Box>
  );
};

export default BookReader;