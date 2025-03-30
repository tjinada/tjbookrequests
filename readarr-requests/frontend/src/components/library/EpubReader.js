// src/components/library/EpubReader.js
import React, { useRef, useState, useEffect } from 'react';
import { ReactReader } from 'react-reader';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import api from '../../utils/api';

const EpubReader = ({ url, fontSize = 100, theme = 'light' }) => {
  const [location, setLocation] = useState(null);
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
        
        // Create a blob URL from the response data
        const epubBlob = new Blob([response.data], { type: 'application/epub+zip' });
        const epubUrl = URL.createObjectURL(epubBlob);
        setBookData(epubUrl);
        
        // Loading will be set to false after the book is rendered
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
  const locationChanged = (epubcifi) => {
    // epubcifi is a string containing the current location in the book
    setLocation(epubcifi);
    
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
  
  // Set up rendition
  const getRendition = (rendition) => {
    // Store rendition for later use
    renditionRef.current = rendition;
    setRendition(rendition);
    
    // Apply font size
    rendition.themes.fontSize(`${fontSize}%`);
    
    // Register themes
    rendition.themes.register('light', {
      body: {
        color: '#000',
        background: '#fff'
      }
    });
    
    rendition.themes.register('sepia', {
      body: {
        color: '#5B4636',
        background: '#FBF0D9'
      }
    });
    
    rendition.themes.register('dark', {
      body: {
        color: '#ccc',
        background: '#222'
      }
    });
    
    // Apply theme
    rendition.themes.select(theme);
    
    // Fix for TOC links - handle internal navigation
    rendition.on('selected', function(cfiRange, contents) {
      rendition.display(cfiRange);
    });
    
    // Handle clicks on internal links
    rendition.on('linkClicked', function(href) {
      rendition.display(href);
    });
    
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
          backgroundColor: 'rgba(255,255,255,0.7)',
          zIndex: 1,
          flexDirection: 'column'
        }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading EPUB...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 3
        }}>
          <Alert severity="error" sx={{ width: '100%', maxWidth: 500 }}>
            {error}
          </Alert>
        </Box>
      )}
      
      {bookData && (
        <ReactReader
          url={bookData}
          title={""}
          location={location}
          locationChanged={locationChanged}
          getRendition={getRendition}
          showToc={false}
          tocChanged={(toc) => {
            tocRef.current = toc;
          }}
          epubOptions={{
            flow: 'paginated',
            manager: 'continuous'
          }}
          styles={{
            container: {
              height: '100%',
              width: '100%',
              backgroundColor: theme === 'dark' ? '#222' : 
                               theme === 'sepia' ? '#FBF0D9' : '#fff'
            },
            readerArea: {
              height: '100%',
              width: '100%'
            }
          }}
        />
      )}
      
      {totalPages > 0 && (
        <Box sx={{ 
          position: 'absolute', 
          bottom: 10, 
          right: 10, 
          backgroundColor: theme === 'dark' ? 'rgba(50,50,50,0.8)' : 'rgba(255,255,255,0.8)', 
          color: theme === 'dark' ? '#ccc' : 'inherit',
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