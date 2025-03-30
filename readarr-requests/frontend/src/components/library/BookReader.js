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
  Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import api from '../../utils/api';

// Import the specialized reader components
import EpubReader from './EpubReader';

const BookReader = () => {
  const { id, format = 'epub' } = useParams();
  const navigate = useNavigate();
  
  // State for reader
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [book, setBook] = useState(null);
  const [currentFormat, setCurrentFormat] = useState(format.toLowerCase());
  
  // Basic settings
  const [fontSize, setFontSize] = useState(100);
  const [readerTheme, setReaderTheme] = useState('light');
  
  // Simple bookmarks for testing
  const [currentLocation, setCurrentLocation] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  
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
        console.log(`Loading book ID: ${id} in format: ${format}`);
        
        // Get book details
        const bookResponse = await api.get(`/library/book/${id}`);
        console.log('Book details loaded:', bookResponse.data.title);
        setBook(bookResponse.data);
        
        // Load saved location if available
        const lastLocation = localStorage.getItem(`book_location_${id}`);
        if (lastLocation) {
          console.log('Loaded saved location:', lastLocation.substring(0, 20) + '...');
          setCurrentLocation(lastLocation);
        }
        
        // Load saved bookmarks
        try {
          const savedBookmarks = localStorage.getItem(`bookmarks_${id}`);
          if (savedBookmarks) {
            console.log('Loaded bookmarks');
            setBookmarks(JSON.parse(savedBookmarks));
          }
        } catch (err) {
          console.error('Error loading bookmarks:', err);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading book:', err);
        setError(`Failed to load book information: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadBook();
  }, [id, format]);
  
  // Handle location change (from EPUB reader)
  const handleLocationChanged = (newLocation) => {
    console.log('Location changed:', newLocation.substring(0, 20) + '...');
    setCurrentLocation(newLocation);
    
    // Save current location to localStorage
    localStorage.setItem(`book_location_${id}`, newLocation);
  };
  
  // Add/remove bookmark at current location
  const toggleBookmark = () => {
    if (!currentLocation) return;
    
    // Check if this location is already bookmarked
    const isBookmarked = bookmarks.some(b => b.cfi === currentLocation);
    
    if (isBookmarked) {
      // Remove the bookmark
      const updatedBookmarks = bookmarks.filter(b => b.cfi !== currentLocation);
      setBookmarks(updatedBookmarks);
      localStorage.setItem(`bookmarks_${id}`, JSON.stringify(updatedBookmarks));
      console.log('Bookmark removed');
    } else {
      // Add the bookmark
      const newBookmark = {
        cfi: currentLocation,
        title: 'Bookmark ' + (bookmarks.length + 1),
        timestamp: new Date().toISOString()
      };
      
      const updatedBookmarks = [...bookmarks, newBookmark];
      setBookmarks(updatedBookmarks);
      localStorage.setItem(`bookmarks_${id}`, JSON.stringify(updatedBookmarks));
      console.log('Bookmark added');
    }
  };
  
  // Check if current location is bookmarked
  const isCurrentLocationBookmarked = () => {
    return bookmarks.some(b => b.cfi === currentLocation);
  };
  
  // Close reader and go back
  const handleClose = () => {
    navigate('/library');
  };
  
  // Get URL for reader
  const getReaderUrl = () => {
    return `/library/reading/${id}/${currentFormat}`;
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
      {/* Simple header */}
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
        
        <Tooltip title={isCurrentLocationBookmarked() ? "Remove bookmark" : "Add bookmark"}>
          <IconButton 
            onClick={toggleBookmark}
            color={isCurrentLocationBookmarked() ? 'primary' : 'default'}
          >
            {isCurrentLocationBookmarked() ? <BookmarkIcon /> : <BookmarkBorderIcon />}
          </IconButton>
        </Tooltip>
      </Paper>
      
      {/* Reader content area - simplified for testing */}
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
              theme={readerTheme}
              locationChanged={handleLocationChanged}
              initialLocation={currentLocation}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default BookReader;