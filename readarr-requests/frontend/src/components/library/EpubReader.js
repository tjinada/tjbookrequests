// src/components/library/EpubReader.js
import React, { useRef, useState, useEffect } from 'react';
import { ReactReader } from 'react-reader';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import api from '../../utils/api';

const EpubReader = ({ 
  url, 
  fontSize = 100, 
  theme = 'dark', // Default to dark mode
  initialLocation = null,
  locationChanged = () => {},
  tocChanged = () => {},
  getRendition = () => {}
}) => {
  const [location, setLocation] = useState(initialLocation);
  const [rendition, setRendition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [bookData, setBookData] = useState(null);
  const tocRef = useRef(null);
  
  // Fetch the EPUB file using authentication
  useEffect(() => {
    const fetchEpub = async () => {
      try {
        console.log('Fetching EPUB from:', url);
        setLoading(true);
        
        // Use the api utility to fetch the book with authentication
        const response = await api({
          url: url,
          method: 'GET',
          responseType: 'blob',
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        });
        
        console.log('EPUB received, size:', response.data.size);
        
        // Create a blob URL from the response data
        const epubBlob = new Blob([response.data], { type: 'application/epub+zip' });
        const epubUrl = URL.createObjectURL(epubBlob);
        setBookData(epubUrl);
        
        // Don't set loading to false here - we'll do that after rendering
      } catch (err) {
        console.error('Error fetching EPUB:', err);
        setError(`Failed to load EPUB: ${err.message}`);
        setLoading(false);
      }
    };
    
    if (url) {
      fetchEpub();
    }
    
    // Clean up created object URLs when unmounting
    return () => {
      if (bookData) {
        URL.revokeObjectURL(bookData);
      }
    };
  }, [url]);
  
  // Keep track of locator
  const renditionRef = useRef(null);
  const handleLocationChange = (epubcifi) => {
    // epubcifi is a string containing the current location in the book
    setLocation(epubcifi);
    
    // Notify parent component about location change
    locationChanged(epubcifi);
    
    // If we have a rendition, we can get the current page
    if (renditionRef.current) {
      const currentLocation = renditionRef.current.location;
      if (currentLocation && currentLocation.start) {
        // Update current page (rough approximation)
        const { displayed, total } = currentLocation.start.percentage ? 
          {
            displayed: Math.ceil(currentLocation.start.percentage * 100),
            total: 100
          } : 
          currentLocation;
        
        if (displayed && total) {
          setCurrentPage(displayed);
          setTotalPages(total);
        }
      }
    }
  };
  
  // Set up rendition with improved themes
  const handleRenditionReady = (rendition) => {
    console.log('Rendition ready');
    // Store rendition for later use
    renditionRef.current = rendition;
    setRendition(rendition);
    
    // Apply font size
    rendition.themes.fontSize(`${fontSize}%`);
    
    // Register improved themes with better contrast and readability
    rendition.themes.register('light', {
      body: {
        color: '#000',
        background: '#fff',
        'line-height': '1.5',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      },
      'p, li': {
        'font-size': '1em',
        'margin-bottom': '0.8em'
      },
      h1: { 'font-size': '1.8em', 'margin': '0.8em 0' },
      h2: { 'font-size': '1.6em', 'margin': '0.8em 0' },
      h3: { 'font-size': '1.4em', 'margin': '0.7em 0' },
      h4: { 'font-size': '1.2em', 'margin': '0.6em 0' },
      a: { color: '#0066cc' }
    });
    
    rendition.themes.register('sepia', {
      body: {
        color: '#5B4636',
        background: '#FBF0D9',
        'line-height': '1.5',
        'font-family': 'Georgia, serif'
      },
      'p, li': {
        'font-size': '1em',
        'margin-bottom': '0.8em'
      },
      h1: { 'font-size': '1.8em', 'margin': '0.8em 0' },
      h2: { 'font-size': '1.6em', 'margin': '0.8em 0' },
      h3: { 'font-size': '1.4em', 'margin': '0.7em 0' },
      h4: { 'font-size': '1.2em', 'margin': '0.6em 0' },
      a: { color: '#8B4513' }
    });
    
    // Improved dark mode with better contrast
    rendition.themes.register('dark', {
      body: {
        color: '#e8e8e8', // Light gray for better readability
        background: '#121212', // Dark background (not pure black for less eye strain)
        'line-height': '1.5',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      },
      'p, li': {
        'font-size': '1em',
        'margin-bottom': '0.8em'
      },
      h1: { 'font-size': '1.8em', 'margin': '0.8em 0', 'color': '#ffffff' },
      h2: { 'font-size': '1.6em', 'margin': '0.8em 0', 'color': '#ffffff' },
      h3: { 'font-size': '1.4em', 'margin': '0.7em 0', 'color': '#ffffff' },
      h4: { 'font-size': '1.2em', 'margin': '0.6em 0', 'color': '#ffffff' },
      a: { color: '#81d4fa' }, // Light blue links that stand out in dark mode
      img: { 'filter': 'brightness(0.85)' } // Slightly dim images in dark mode
    });
    
    // Apply theme
    rendition.themes.select(theme);
    
    // Fix for TOC links - handle internal navigation
    rendition.on('selected', function(cfiRange) {
      rendition.display(cfiRange);
    });
    
    // Handle clicks on internal links
    rendition.on('linkClicked', function(href) {
      rendition.display(href);
    });
    
    // Pass rendition to parent component
    getRendition(rendition);
    
    // Loading is complete
    setLoading(false);
  };
  
  // Update font size when it changes
  useEffect(() => {
    if (rendition) {
      rendition.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize, rendition]);
  
  // Update theme when it changes
  useEffect(() => {
    if (rendition) {
      rendition.themes.select(theme);
    }
  }, [theme, rendition]);
  
  const handleLoadError = (error) => {
    console.error('Error loading EPUB:', error);
    setError(`Error loading book: ${error.message}`);
    setLoading(false);
  };
  
  // Determine if dark mode is active
  const isDarkMode = theme === 'dark';
  
  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      {loading && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: isDarkMode ? 'rgba(18,18,18,0.9)' : 'rgba(255,255,255,0.9)',
          zIndex: 1,
          flexDirection: 'column'
        }}>
          <CircularProgress color={isDarkMode ? 'secondary' : 'primary'} />
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 2,
              color: isDarkMode ? '#e8e8e8' : 'text.primary'
            }}
          >
            Loading book...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 3,
          backgroundColor: isDarkMode ? '#121212' : undefined
        }}>
          <Alert severity="error" sx={{ 
            width: '100%', 
            maxWidth: 500,
            backgroundColor: isDarkMode ? 'rgba(50,0,0,0.7)' : undefined,
            color: isDarkMode ? '#fff' : undefined,
            '& .MuiAlert-icon': {
              color: isDarkMode ? '#fff' : undefined
            }
          }}>
            {error}
          </Alert>
        </Box>
      )}
      
      {bookData && (
        <ReactReader
          url={bookData}
          title={""}
          location={location}
          locationChanged={handleLocationChange}
          getRendition={handleRenditionReady}
          tocChanged={(toc) => {
            tocRef.current = toc;
            tocChanged(toc);
          }}
          epubOptions={{
            flow: 'paginated',
            manager: 'continuous'
          }}
          styles={{
            container: {
              height: '100%',
              width: '100%',
              backgroundColor: isDarkMode ? '#121212' : 
                               theme === 'sepia' ? '#FBF0D9' : '#fff'
            },
            readerArea: {
              height: '100%',
              width: '100%'
            }
          }}
          loadingView={<div style={{ display: 'none' }}></div>} // Hide default loading view
          epubInitOptions={{
            openAs: 'epub'
          }}
          handleError={handleLoadError}
        />
      )}
      
      {totalPages > 0 && (
        <Box sx={{ 
          position: 'absolute', 
          bottom: 10, 
          right: 10, 
          backgroundColor: isDarkMode ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)', 
          color: isDarkMode ? '#e8e8e8' : 'inherit',
          borderRadius: 10, 
          px: 1.5, 
          py: 0.5,
          fontSize: '0.8rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {currentPage} / {totalPages}
        </Box>
      )}
    </Box>
  );
};

export default EpubReader;