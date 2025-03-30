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
  Paper
} from '@mui/material';
import { ReactReader } from 'react-reader';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ReaderControls from './ReaderControls';
import ReaderSettings from './ReaderSettings';
import useBookmarks from '../../hooks/useBookmarks';
import useReaderSettings from '../../hooks/useReaderSettings';
import { downloadBook, fetchBook } from '../../utils/offlineStorage';

const BookReader = () => {
  const { id, format = 'epub' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Refs
  const renditionRef = useRef(null);
  const tocRef = useRef(null);
  const locationRef = useRef(null);
  
  // State
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
  
  // Custom hooks
  const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useBookmarks(id);
  const { 
    fontSize, 
    setFontSize,
    theme: readerTheme, 
    setTheme: setReaderTheme,
    fontFamily,
    setFontFamily,
    lineSpacing,
    setLineSpacing
  } = useReaderSettings();

  // Load book data when component mounts
  useEffect(() => {
    const loadBook = async () => {
      try {
        setLoading(true);
        
        // Try to load book metadata
        const bookMetadata = await fetchBook(id);
        setBook(bookMetadata);
        
        // Load last location if available
        const lastLocation = localStorage.getItem(`book_location_${id}`);
        if (lastLocation) {
          setLocation(lastLocation);
        }
        
        // Try to get book content from local storage or download it
        const bookContent = await downloadBook(id, format);
        setBookData(bookContent);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading book:', err);
        setError('Failed to load book. Please try again.');
        setLoading(false);
      }
    };
    
    loadBook();
  }, [id, format]);

  // Handle rendition ready
  const handleRenditionReady = (rendition) => {
    renditionRef.current = rendition;
    
    // Apply styles based on settings
    rendition.themes.fontSize(`${fontSize}%`);
    rendition.themes.font(fontFamily);
    
    // Register themes
    rendition.themes.register('light', {
      body: { 
        color: '#000', 
        background: '#fff',
        'line-height': `${lineSpacing}`
      }
    });
    
    rendition.themes.register('sepia', {
      body: { 
        color: '#5B4636', 
        background: '#FBF0D9',
        'line-height': `${lineSpacing}`
      }
    });
    
    rendition.themes.register('dark', {
      body: { 
        color: '#ccc', 
        background: '#222',
        'line-height': `${lineSpacing}`
      }
    });
    
    // Apply theme
    rendition.themes.select(readerTheme);
    
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
  };

  // Handle location change
  const handleLocationChanged = (newLocation) => {
    locationRef.current = newLocation;
    setLocation(newLocation);
    
    // Save current location to localStorage
    localStorage.setItem(`book_location_${id}`, newLocation);
    
    // Update current page display
    if (renditionRef.current && tocRef.current) {
      const { displayed, total } = renditionRef.current.location.start;
      setCurrentPage(displayed.page);
      setTotalPages(total.pages);
    }
  };

  // Handle bookmark toggle
  const toggleBookmark = () => {
    if (locationRef.current) {
      if (isBookmarked(locationRef.current)) {
        removeBookmark(locationRef.current);
        showNotification('Bookmark removed', 'info');
      } else {
        const currentCfi = locationRef.current;
        let pageTitle = '';
        
        // Try to get the current chapter title
        if (renditionRef.current) {
          try {
            const currentLocation = renditionRef.current.currentLocation();
            pageTitle = currentLocation?.start?.href || 'Unknown page';
            
            // Try to get a better title from TOC if available
            if (tocRef.current) {
              const chapter = tocRef.current.find(item => 
                item.href.includes(pageTitle.split('#')[0])
              );
              if (chapter) {
                pageTitle = chapter.label || pageTitle;
              }
            }
          } catch (e) {
            console.error('Error getting page title', e);
          }
        }
        
        addBookmark(currentCfi, pageTitle);
        showNotification('Bookmark added', 'success');
      }
    }
  };

  // Handle settings open/close
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  // Handle TOC open/close
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

  // Handle bookmark navigation
  const goToBookmark = (cfi) => {
    if (renditionRef.current && cfi) {
      renditionRef.current.display(cfi);
      if (isMobile) {
        setTocOpen(false);
      }
    }
  };

  // Handle TOC navigation
  const goToChapter = (href) => {
    if (renditionRef.current && href) {
      renditionRef.current.display(href);
      if (isMobile) {
        setTocOpen(false);
      }
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
          <IconButton 
            onClick={toggleBookmark}
            color={isBookmarked(location) ? 'primary' : 'default'}
          >
            {isBookmarked(location) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
          </IconButton>
          <IconButton onClick={toggleToc}>
            <MenuBookIcon />
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
                background: readerTheme === 'light' ? '#fff' : 
                             readerTheme === 'sepia' ? '#FBF0D9' : '#222'
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
        setFontSize={setFontSize}
        theme={readerTheme}
        setTheme={setReaderTheme}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        lineSpacing={lineSpacing}
        setLineSpacing={setLineSpacing}
      />
      
      {/* TOC and Bookmarks drawer */}
      <Drawer
        anchor="left"
        open={tocOpen}
        onClose={toggleToc}
        PaperProps={{
          sx: { width: { xs: '80%', sm: 350 } }
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
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => goToBookmark(bookmark.cfi)}
                >
                  <BookmarkIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2">
                    {bookmark.title || 'Unnamed bookmark'}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No bookmarks yet. Add bookmarks by clicking the bookmark icon.
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