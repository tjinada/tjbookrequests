// src/components/reader/BookReader.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Drawer,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  Paper,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { ReactReader } from 'react-reader';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DeleteIcon from '@mui/icons-material/Delete';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ReaderControls from './ReaderControls';
import ReaderSettings from './ReaderSettings';
import api from '../../utils/api';

const BookReader = () => {
  const { id, format = 'epub' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Refs
  const renditionRef = useRef(null);
  const tocRef = useRef(null);
  const locationRef = useRef(null);
  
  // Basic state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [book, setBook] = useState(null);
  const [bookData, setBookData] = useState(null);
  const [location, setLocation] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    // Try to get preference from localStorage or use system preference
    const savedMode = localStorage.getItem('readerDarkMode');
    if (savedMode) return savedMode === 'true';
    
    // Check system preference as fallback
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // Reader settings
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('reader_fontSize');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [fontFamily, setFontFamily] = useState(() => {
    return localStorage.getItem('reader_fontFamily') || 'serif';
  });
  const [lineSpacing, setLineSpacing] = useState(() => {
    const saved = localStorage.getItem('reader_lineSpacing');
    return saved ? parseFloat(saved) : 1.5;
  });
  
  // Bookmarks state
  const [bookmarks, setBookmarks] = useState(() => {
    // Load bookmarks from localStorage
    try {
      const saved = localStorage.getItem(`bookmarks_${id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading bookmarks:', e);
      return [];
    }
  });

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
        
        // Load last location if available
        const lastLocation = localStorage.getItem(`book_location_${id}`);
        if (lastLocation) {
          setLocation(lastLocation);
        }
        
        // Get book content for reading
        const bookContentUrl = `/api/library/reading/${id}/${format}`;
        
        // Fetch the book content with authentication
        const response = await api({
          url: bookContentUrl,
          method: 'GET',
          responseType: 'blob',
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        });
        
        // Create a blob URL for the book content
        const bookUrl = URL.createObjectURL(response.data);
        setBookData(bookUrl);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading book:', err);
        if (err.response && err.response.status === 401) {
          setError('Authentication required. Please sign in again.');
        } else {
          setError('Failed to load book. Please try again.');
        }
        setLoading(false);
      }
    };
    
    loadBook();
    
    // Cleanup function to revoke blob URL
    return () => {
      if (bookData) {
        URL.revokeObjectURL(bookData);
      }
    };
  }, [id, format]);

  // Toggle dark mode function
  const toggleDarkMode = () => {
    setDarkMode(prevMode => {
      const newMode = !prevMode;
      localStorage.setItem('readerDarkMode', newMode.toString());
      
      // Apply dark mode theme to reader if it's already initialized
      if (renditionRef.current) {
        if (newMode) {
          renditionRef.current.themes.select('dark');
        } else {
          renditionRef.current.themes.select('light');
        }
      }
      
      return newMode;
    });
  };

  // Bookmark functions
  const addBookmark = (cfi, chapterName = 'Unnamed bookmark') => {
    if (!cfi) return;
    
    // Create new bookmark
    const newBookmark = {
      cfi,
      title: chapterName,
      created: new Date().toISOString(),
      // Add page number or percentage if available
      location: renditionRef.current?.location?.start?.percentage 
        ? `${Math.floor(renditionRef.current.location.start.percentage * 100)}%`
        : currentPage ? `Page ${currentPage}` : ''
    };
    
    // Update state
    setBookmarks(prevBookmarks => {
      const updatedBookmarks = [...prevBookmarks, newBookmark];
      
      // Save to localStorage
      localStorage.setItem(`bookmarks_${id}`, JSON.stringify(updatedBookmarks));
      
      return updatedBookmarks;
    });
    
    // Show success notification
    showNotification('Bookmark added', 'success');
  };

  const removeBookmark = (cfiToRemove) => {
    if (!cfiToRemove) return;
    
    setBookmarks(prevBookmarks => {
      const updatedBookmarks = prevBookmarks.filter(bookmark => bookmark.cfi !== cfiToRemove);
      
      // Save to localStorage
      localStorage.setItem(`bookmarks_${id}`, JSON.stringify(updatedBookmarks));
      
      return updatedBookmarks;
    });
    
    showNotification('Bookmark removed', 'info');
  };

  const isBookmarked = (cfi) => {
    if (!cfi || !bookmarks.length) return false;
    return bookmarks.some(bookmark => bookmark.cfi === cfi);
  };

  const handleBookmarkClick = () => {
    if (!location) return;
    
    if (isBookmarked(location)) {
      removeBookmark(location);
    } else {
      // Try to get current chapter name from TOC
      let chapterName = 'Bookmark';
      try {
        if (renditionRef.current && tocRef.current) {
          const currentLocation = renditionRef.current.currentLocation();
          const chapter = tocRef.current.find(item => 
            item.href && currentLocation.start.href && 
            item.href.includes(currentLocation.start.href.split('#')[0])
          );
          
          if (chapter && chapter.label) {
            chapterName = chapter.label;
          }
        }
      } catch (e) {
        console.error('Error getting chapter name:', e);
      }
      
      addBookmark(location, chapterName);
    }
  };

  // Handle rendition ready
  const handleRenditionReady = (rendition) => {
    renditionRef.current = rendition;
    
    // Apply styles based on settings
    rendition.themes.fontSize(`${fontSize}%`);
    rendition.themes.font(fontFamily);
    
    // Register enhanced themes
    rendition.themes.register('light', {
      body: { 
        color: '#000', 
        background: '#fff',
        'line-height': `${lineSpacing}`,
        'padding-top': '10px',
        'padding-bottom': '10px'
      },
      'a': { color: '#1e88e5' },
      'h1, h2, h3, h4, h5, h6': { color: '#333' }
    });
    
    rendition.themes.register('dark', {
      body: { 
        color: '#e0e0e0', 
        background: '#303030',
        'line-height': `${lineSpacing}`,
        'padding-top': '10px',
        'padding-bottom': '10px' 
      },
      'a': { color: '#90caf9' },
      'h1, h2, h3, h4, h5, h6': { color: '#e0e0e0' },
      'img, image': { 'filter': 'brightness(.8) contrast(1.2)' },
      'p': { color: '#e0e0e0' }
    });
    
    rendition.themes.register('sepia', {
      body: { 
        color: '#5B4636', 
        background: '#FBF0D9',
        'line-height': `${lineSpacing}`,
        'padding-top': '10px',
        'padding-bottom': '10px'
      },
      'a': { color: '#b7410e' }
    });
    
    // Apply theme based on current mode
    rendition.themes.select(darkMode ? 'dark' : 'light');
    
    // Handle key events for navigation
    rendition.on('keyup', (e) => {
      if (e.key === 'ArrowLeft') {
        rendition.prev();
      }
      if (e.key === 'ArrowRight') {
        rendition.next();
      }
    });
    
    // Create swipe event handlers for mobile
    let touchstart = null;
    rendition.on('touchstart', (e) => {
      touchstart = e.changedTouches[0];
    });
    
    rendition.on('touchend', (e) => {
      if (!touchstart) return;
      const touchend = e.changedTouches[0];
      const deltaX = touchend.screenX - touchstart.screenX;
      const deltaY = touchend.screenY - touchstart.screenY;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 50) {
          rendition.prev();
        } else if (deltaX < -50) {
          rendition.next();
        }
      }
    });
    
    // Prevent default link behavior for better PWA experience
    rendition.hooks.content.register(contents => {
      contents.window.addEventListener('click', (event) => {
        if (event.target.tagName.toLowerCase() === 'a' && event.target.href) {
          // Prevent default link behavior
          event.preventDefault();
          
          // Handle internal navigation
          const href = event.target.getAttribute('href');
          if (href && !href.startsWith('http')) {
            rendition.display(href);
          }
        }
      });
    });
  };

  // Handle location change
  const handleLocationChanged = (newLocation) => {
    locationRef.current = newLocation;
    setLocation(newLocation);
    
    // Save current location to localStorage
    localStorage.setItem(`book_location_${id}`, newLocation);
    
    // Update current page display
    if (renditionRef.current && renditionRef.current.location) {
      try {
        const { displayed, total } = renditionRef.current.location.start;
        if (displayed && total) {
          setCurrentPage(displayed.page);
          setTotalPages(total.pages);
        } else if (renditionRef.current.location.start.percentage) {
          // Use percentage as fallback
          const percentage = renditionRef.current.location.start.percentage * 100;
          setCurrentPage(Math.round(percentage));
          setTotalPages(100);
        }
      } catch (e) {
        console.error('Error updating page info:', e);
      }
    }
  };

  // Fix for TOC navigation in PWAs
  const goToChapter = (href) => {
    if (renditionRef.current && href) {
      try {
        // Try a more direct approach to navigate without triggering external page navigation
        const location = href.indexOf('#') > -1 ? href.split('#')[1] : href;
        
        // Use CFI if available, otherwise fall back to href
        if (location && location.startsWith('/')) {
          // This is likely an internal path
          renditionRef.current.display(location);
        } else {
          // Try to look up the chapter in TOC to get exact CFI
          if (tocRef.current) {
            const chapter = tocRef.current.find(item => item.href === href);
            if (chapter && chapter.cfi) {
              renditionRef.current.display(chapter.cfi);
            } else {
              renditionRef.current.display(href);
            }
          } else {
            renditionRef.current.display(href);
          }
        }
        
        // Close TOC on mobile
        if (isMobile) {
          setTocOpen(false);
        }
      } catch (error) {
        console.error('Error navigating to chapter:', error);
        // Fallback method
        renditionRef.current.display(href);
      }
    }
  };

  // Handle bookmark navigation
  const goToBookmark = (cfi) => {
    if (renditionRef.current && cfi) {
      renditionRef.current.display(cfi);
      if (isMobile) {
        setTocOpen(false);
      }
    }
  };

  // Toggle settings drawer
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  // Toggle TOC drawer
  const toggleToc = () => {
    setTocOpen(!tocOpen);
  };

  // Show notification
  const showNotification = (message, severity) => {
    setNotification({ open: true, message, severity });
  };

  // Handle navigation
  const handleNavigation = (type) => {
    if (!renditionRef.current) return;
    
    if (type === 'prev') {
      renditionRef.current.prev();
    } else if (type === 'next') {
      renditionRef.current.next();
    }
  };

  // Handle close reader and go back
  const handleClose = () => {
    navigate(-1);
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
        <Typography variant="body1">
          Unable to load the book. Please try again or select a different format.
        </Typography>
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
          <IconButton onClick={toggleToc} sx={{ mr: 1 }}>
            <FormatListBulletedIcon />
          </IconButton>
          <IconButton onClick={toggleSettings}>
            <SettingsIcon />
          </IconButton>
        </Box>
      </Paper>
      
      {/* Reader content area */}
      <Box sx={{ 
        flex: 1, 
        position: 'relative',
        overflow: 'hidden'
      }}>
        {bookData ? (
          <ReactReader
            url={bookData}
            title={book?.title}
            location={location}
            locationChanged={handleLocationChanged}
            getRendition={(rendition) => handleRenditionReady(rendition)}
            epubOptions={{
              allowPopups: true,
              flow: 'paginated',
              manager: 'continuous'
            }}
            swipeable
            showToc={false}
            tocChanged={(toc) => {
              tocRef.current = toc;
            }}
            styles={{
              container: {
                overflow: 'hidden',
                background: darkMode ? '#303030' : '#fff'
              },
              readerArea: {
                transition: 'padding 0.3s ease',
                padding: '20px 0'
              }
            }}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%'
            }}
          >
            <Typography variant="body1">
              No book data available
            </Typography>
          </Box>
        )}
        
        {/* Bookmark button */}
        <Tooltip title={isBookmarked(location) ? "Remove bookmark" : "Add bookmark"}>
          <IconButton 
            onClick={handleBookmarkClick}
            color={isBookmarked(location) ? "primary" : "default"}
            sx={{ 
              position: 'absolute',
              top: 70, // Position below header
              right: 16,
              bgcolor: 'background.paper',
              opacity: 0.7,
              '&:hover': { opacity: 1 },
              boxShadow: 2
            }}
          >
            {isBookmarked(location) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
          </IconButton>
        </Tooltip>
        
        {/* Dark mode toggle */}
        <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"}>
          <IconButton 
            onClick={toggleDarkMode}
            sx={{ 
              position: 'absolute',
              bottom: 16,
              left: 16,
              bgcolor: 'background.paper',
              opacity: 0.7,
              '&:hover': { opacity: 1 },
              boxShadow: 2
            }}
          >
            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>
        
        {/* Overlay controls for navigation */}
        <ReaderControls
          onPrev={() => handleNavigation('prev')}
          onNext={() => handleNavigation('next')}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </Box>
      
      {/* Settings drawer */}
      <ReaderSettings
        open={settingsOpen}
        onClose={toggleSettings}
        fontSize={fontSize}
        setFontSize={(newSize) => {
          setFontSize(newSize);
          localStorage.setItem('reader_fontSize', newSize);
          if (renditionRef.current) {
            renditionRef.current.themes.fontSize(`${newSize}%`);
          }
        }}
        theme={darkMode ? 'dark' : 'light'}
        setTheme={(newTheme) => {
          setDarkMode(newTheme === 'dark');
          localStorage.setItem('readerDarkMode', newTheme === 'dark');
          if (renditionRef.current) {
            renditionRef.current.themes.select(newTheme);
          }
        }}
        fontFamily={fontFamily}
        setFontFamily={(newFamily) => {
          setFontFamily(newFamily);
          localStorage.setItem('reader_fontFamily', newFamily);
          if (renditionRef.current) {
            renditionRef.current.themes.font(newFamily);
          }
        }}
        lineSpacing={lineSpacing}
        setLineSpacing={(newSpacing) => {
          setLineSpacing(newSpacing);
          localStorage.setItem('reader_lineSpacing', newSpacing);
          // Apply line spacing to themes
          if (renditionRef.current) {
            const currentTheme = darkMode ? 'dark' : 'light';
            const updatedStyles = { 'body': { 'line-height': `${newSpacing}` } };
            renditionRef.current.themes.override(currentTheme, updatedStyles);
          }
        }}
      />
      
      {/* TOC and Bookmarks drawer */}
      <Drawer
        anchor="left"
        open={tocOpen}
        onClose={toggleToc}
        PaperProps={{
          sx: { width: { xs: '85%', sm: 350 } }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {book?.title || 'Book Reader'}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {book?.author || 'Unknown Author'}
          </Typography>
          
          {/* Table of Contents */}
          {tocRef.current && tocRef.current.length > 0 && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                Table of Contents
              </Typography>
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
                {tocRef.current.map((chapter, index) => (
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
                    onClick={() => goToChapter(chapter.href)}
                  >
                    <Typography variant="body2">
                      {chapter.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
          
          {/* Bookmarks */}
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 'bold' }}>
            Bookmarks ({bookmarks.length})
          </Typography>
          {bookmarks.length > 0 ? (
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
              {bookmarks.map((bookmark, index) => (
                <Box 
                  component="li" 
                  key={index}
                  sx={{ 
                    py: 1.5, 
                    px: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <Box 
                    onClick={() => goToBookmark(bookmark.cfi)}
                    sx={{ 
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <Typography variant="body2">
                      {bookmark.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {bookmark.location}
                    </Typography>
                  </Box>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBookmark(bookmark.cfi);
                    }}
                    color="default"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No bookmarks yet. Add bookmarks by clicking the bookmark icon while reading.
            </Typography>
          )}
        </Box>
      </Drawer>
      
      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BookReader;