// src/components/library/BookReader.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Slider,
  Drawer,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  Fab,
  Divider,
  Select,
  MenuItem,
  FormControl,
  Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BrightnessHighIcon from '@mui/icons-material/BrightnessHigh';
import BrightnessLowIcon from '@mui/icons-material/BrightnessLow';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import LibraryContext from '../../context/LibraryContext';

// This is a placeholder component for a book reader
// In a real implementation, you would integrate with a library like epub.js for EPUBs
// or PDF.js for PDFs to render the actual book content
const BookReader = () => {
  const { bookId, format = 'epub' } = useParams();
  const navigate = useNavigate();
  //const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { getBookDetails } = useContext(LibraryContext);
  
  // Reader container ref
  const readerContainerRef = useRef(null);
  
  // State
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fontSize, setFontSize] = useState(100); // percentage
  const [brightness, setBrightness] = useState(100); // percentage
  const [theme, setTheme] = useState('dark'); // 'light', 'dark', 'sepia'
  const [bookmarks, setBookmarks] = useState([]);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayTimeout, setOverlayTimeout] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Load book data
  useEffect(() => {
    if (!bookId) {
      setError('Book ID is required');
      setLoading(false);
      return;
    }
    
    const loadBook = async () => {
      try {
        // Get book details
        const bookData = await getBookDetails(bookId);
        setBook(bookData);
        
        // Load reader settings from localStorage
        const savedSettings = localStorage.getItem('readerSettings');
        if (savedSettings) {
          const { fontSize, brightness, theme } = JSON.parse(savedSettings);
          setFontSize(fontSize || 100);
          setBrightness(brightness || 100);
          setTheme(theme || 'light');
        }
        
        // Load bookmarks from localStorage
        const savedBookmarks = localStorage.getItem(`bookmarks_${bookId}`);
        if (savedBookmarks) {
          setBookmarks(JSON.parse(savedBookmarks));
        }
        
        // Simulate loading the book content
        // In a real implementation, you would initialize your book reader library here
        setTimeout(() => {
          setTotalPages(Math.floor(Math.random() * 300) + 50); // Random for demo
          setLoading(false);
          
          // Auto-hide overlay after 3 seconds
          setOverlayTimeout(setTimeout(() => {
            setShowOverlay(false);
          }, 3000));
        }, 1500);
      } catch (err) {
        console.error('Error loading book:', err);
        setError('Failed to load book. Please try again.');
        setLoading(false);
      }
    };
    
    loadBook();
    
    // Set up event listeners for overlay
    const handleTap = () => {
      toggleOverlay();
      
      // Clear existing timeout
      if (overlayTimeout) {
        clearTimeout(overlayTimeout);
      }
      
      // Set new timeout to hide overlay
      if (showOverlay) {
        setOverlayTimeout(setTimeout(() => {
          setShowOverlay(false);
        }, 3000));
      }
    };
    
    // Add event listener to the document
    document.addEventListener('click', handleTap);
    
    return () => {
      // Clean up
      document.removeEventListener('click', handleTap);
      if (overlayTimeout) {
        clearTimeout(overlayTimeout);
      }
    };
  }, [bookId, getBookDetails, overlayTimeout, showOverlay]);
  
  // Save settings whenever they change
  useEffect(() => {
    localStorage.setItem('readerSettings', JSON.stringify({
      fontSize,
      brightness,
      theme
    }));
    
    // Apply settings to the reader
    if (readerContainerRef.current) {
      // Apply font size
      readerContainerRef.current.style.fontSize = `${fontSize}%`;
      
      // Apply brightness as an overlay
      const brightnessOverlay = document.querySelector('.brightness-overlay');
      if (brightnessOverlay) {
        const opacity = (100 - brightness) / 100;
        brightnessOverlay.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
      }
      
      // Apply theme
      const container = readerContainerRef.current;
      container.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
      container.classList.add(`theme-${theme}`);
    }
  }, [fontSize, brightness, theme]);
  
  // Toggle the overlay
  const toggleOverlay = () => {
    setShowOverlay(!showOverlay);
  };
  
  // Go back to library
  const handleBack = () => {
    navigate('/library');
  };
  
  // Toggle settings drawer
  const handleToggleSettings = () => {
    setSettingsOpen(!settingsOpen);
    setBookmarksOpen(false);
  };
  
  // Toggle bookmarks drawer
  const handleToggleBookmarks = () => {
    setBookmarksOpen(!bookmarksOpen);
    setSettingsOpen(false);
  };
  
  // Navigate to next page
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Navigate to previous page
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Add bookmark
  const handleAddBookmark = () => {
    // Check if current page is already bookmarked
    const exists = bookmarks.some(bookmark => bookmark.page === currentPage);
    if (exists) {
      // Remove bookmark
      const newBookmarks = bookmarks.filter(bookmark => bookmark.page !== currentPage);
      setBookmarks(newBookmarks);
      localStorage.setItem(`bookmarks_${bookId}`, JSON.stringify(newBookmarks));
      setSnackbarMessage('Bookmark removed');
    } else {
      // Add bookmark
      const newBookmark = {
        page: currentPage,
        text: `Page ${currentPage}`,
        timestamp: new Date().toISOString()
      };
      const newBookmarks = [...bookmarks, newBookmark];
      setBookmarks(newBookmarks);
      localStorage.setItem(`bookmarks_${bookId}`, JSON.stringify(newBookmarks));
      setSnackbarMessage('Bookmark added');
    }
    setSnackbarOpen(true);
  };
  
  // Go to bookmark
  const handleGoToBookmark = (page) => {
    setCurrentPage(page);
    setBookmarksOpen(false);
    setSnackbarMessage(`Jumped to page ${page}`);
    setSnackbarOpen(true);
  };
  
  // Check if current page is bookmarked
  const isCurrentPageBookmarked = () => {
    return bookmarks.some(bookmark => bookmark.page === currentPage);
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
          bgcolor: theme === 'dark' ? '#121212' : theme === 'sepia' ? '#f8f1e3' : '#ffffff'
        }}
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading {book?.title || 'book'}...
        </Typography>
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" onClick={handleBack}>
              Back to Library
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1300,
        bgcolor: 'background.default'
      }}
    >
      {/* Brightness overlay */}
      <Box 
        className="brightness-overlay" 
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: `rgba(0, 0, 0, ${(100 - brightness) / 100})`,
          pointerEvents: 'none',
          zIndex: 10
        }} 
      />
      
      {/* Top overlay bar */}
      <Paper 
        elevation={3}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          transition: 'transform 0.3s ease',
          transform: showOverlay ? 'translateY(0)' : 'translateY(-100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 1,
          bgcolor: theme === 'dark' ? '#333' : theme === 'sepia' ? '#e8dcb5' : '#fff'
        }}
      >
        <IconButton onClick={handleBack} edge="start">
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ flex: 1, textAlign: 'center', ml: 2 }}>
          {book?.title || 'Reading'}
        </Typography>
        
        <Box>
          <IconButton onClick={handleToggleBookmarks}>
            <BookmarkIcon color={isCurrentPageBookmarked() ? "primary" : "inherit"} />
          </IconButton>
          <IconButton onClick={handleToggleSettings} edge="end">
            <SettingsIcon />
          </IconButton>
        </Box>
      </Paper>
      
      {/* Bottom overlay bar */}
      <Paper 
        elevation={3}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          transition: 'transform 0.3s ease',
          transform: showOverlay ? 'translateY(0)' : 'translateY(100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 1,
          bgcolor: theme === 'dark' ? '#333' : theme === 'sepia' ? '#e8dcb5' : '#fff'
        }}
      >
        <IconButton 
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
        >
          <NavigateBeforeIcon />
        </IconButton>
        
        <Typography variant="body2">
          Page {currentPage} of {totalPages}
        </Typography>
        
        <IconButton 
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
        >
          <NavigateNextIcon />
        </IconButton>
      </Paper>
      
      {/* Reader content */}
      <Box 
        ref={readerContainerRef}
        className={`theme-${theme}`}
        sx={{
          flex: 1,
          p: 3,
          overflow: 'auto',
          bgcolor: theme === 'dark' ? '#121212' : theme === 'sepia' ? '#f8f1e3' : '#ffffff',
          color: theme === 'dark' ? '#e0e0e0' : theme === 'sepia' ? '#5f4b32' : 'text.primary',
          fontSize: `${fontSize}%`,
          transition: 'background-color 0.3s ease, color 0.3s ease',
          pt: 8, // Space for the top bar
          pb: 8  // Space for the bottom bar
        }}
      >
        {/* This is a placeholder for actual book content */}
        {/* In a real implementation, you would render the book content from epub.js or PDF.js here */}
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <Typography variant="h4" gutterBottom align="center">
            {book?.title || 'Book Title'}
          </Typography>
          
          <Typography variant="h6" gutterBottom align="center" color="text.secondary">
            {book?.author || 'Author Name'}
          </Typography>
          
          <Typography variant="h6" gutterBottom align="center">
            Chapter {Math.ceil(currentPage / 10)}
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography paragraph>
            This is a placeholder for the actual book content. In a real implementation,
            you would integrate with a library like epub.js or PDF.js to render the book.
            This page is demonstrating UI features like the reader settings, bookmarks,
            and navigation.
          </Typography>
          
          <Typography paragraph>
            Try the settings button to adjust font size, brightness, and theme.
            You can also bookmark pages and navigate between them.
          </Typography>
          
          {/* Generate some random paragraphs for demonstration */}
          {Array.from({ length: 15 }, (_, i) => (
            <Typography key={i} paragraph>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. 
              Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus 
              rhoncus ut eleifend nibh porttitor. Ut in nulla enim. Phasellus molestie magna 
              non est bibendum non venenatis nisl tempor. Suspendisse dictum feugiat nisl ut dapibus.
            </Typography>
          ))}
          
          <Typography align="center" sx={{ mt: 3 }}>
            Page {currentPage} of {totalPages}
          </Typography>
        </Box>
      </Box>
      
      {/* Settings drawer */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: { width: { xs: 280, sm: 350 } }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Reader Settings
          </Typography>
          
          <Divider sx={{ mb: 3 }} />
          
          {/* Font size control */}
          <Typography id="font-size-slider" gutterBottom>
            Font Size: {fontSize}%
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <ZoomOutIcon sx={{ mr: 2 }} />
            <Slider
              value={fontSize}
              onChange={(e, newValue) => setFontSize(newValue)}
              aria-labelledby="font-size-slider"
              min={50}
              max={200}
              step={10}
            />
            <ZoomInIcon sx={{ ml: 2 }} />
          </Box>
          
          {/* Brightness control */}
          <Typography id="brightness-slider" gutterBottom>
            Brightness: {brightness}%
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <BrightnessLowIcon sx={{ mr: 2 }} />
            <Slider
              value={brightness}
              onChange={(e, newValue) => setBrightness(newValue)}
              aria-labelledby="brightness-slider"
              min={30}
              max={100}
            />
            <BrightnessHighIcon sx={{ ml: 2 }} />
          </Box>
          
          {/* Theme selection */}
          <Typography gutterBottom>
            Theme
          </Typography>
          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
            <Select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              displayEmpty
            >
              <MenuItem value="light">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WbSunnyIcon sx={{ mr: 1 }} />
                  Light
                </Box>
              </MenuItem>
              <MenuItem value="dark">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <NightsStayIcon sx={{ mr: 1 }} />
                  Dark
                </Box>
              </MenuItem>
              <MenuItem value="sepia">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormatColorFillIcon sx={{ mr: 1 }} />
                  Sepia
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            variant="outlined" 
            fullWidth
            onClick={() => {
              setFontSize(100);
              setBrightness(100);
              setTheme('light');
            }}
          >
            Reset to Default
          </Button>
        </Box>
      </Drawer>
      
      {/* Bookmarks drawer */}
      <Drawer
        anchor="left"
        open={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
        PaperProps={{
          sx: { width: { xs: 280, sm: 350 } }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Bookmarks
          </Typography>
          
          <Divider sx={{ mb: 2 }} />
          
          {bookmarks.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No bookmarks yet. Add bookmarks by tapping the bookmark icon while reading.
            </Typography>
          ) : (
            bookmarks
              .sort((a, b) => a.page - b.page)
              .map((bookmark) => (
                <Button
                  key={bookmark.page}
                  fullWidth
                  variant={currentPage === bookmark.page ? "contained" : "text"}
                  sx={{ 
                    justifyContent: 'flex-start', 
                    px: 1, 
                    py: 1.5,
                    mb: 1,
                    borderRadius: 1,
                    border: currentPage === bookmark.page ? 'none' : '1px solid rgba(0,0,0,0.12)',
                    textAlign: 'left'
                  }}
                  onClick={() => handleGoToBookmark(bookmark.page)}
                  startIcon={<BookmarkIcon />}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="body2">
                      Page {bookmark.page}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(bookmark.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </Button>
              ))
          )}
          
          <Box sx={{ mt: 2 }}>
            <Button 
              fullWidth 
              color="primary"
              variant="contained"
              onClick={handleAddBookmark}
              startIcon={isCurrentPageBookmarked() ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            >
              {isCurrentPageBookmarked() ? 'Remove Bookmark' : 'Bookmark Current Page'}
            </Button>
          </Box>
        </Box>
      </Drawer>
      
      {/* Floating navigation buttons for mobile */}
      {isMobile && showOverlay && (
        <Box sx={{ position: 'fixed', bottom: 70, right: 16, zIndex: 15 }}>
          <Fab
            color="primary"
            size="medium"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            sx={{ ml: 1 }}
          >
            <NavigateNextIcon />
          </Fab>
        </Box>
      )}
      
      {isMobile && showOverlay && (
        <Box sx={{ position: 'fixed', bottom: 70, left: 16, zIndex: 15 }}>
          <Fab
            color="primary"
            size="medium"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
          >
            <NavigateBeforeIcon />
          </Fab>
        </Box>
      )}
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center'
        }}
      />
    </Box>
  );
};

export default BookReader;