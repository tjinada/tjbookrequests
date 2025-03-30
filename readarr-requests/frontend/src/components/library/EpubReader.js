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
  
  // Add a <style> tag to the document head for dark mode
  useEffect(() => {
    if (theme === 'dark') {
      // Create a style element
      const style = document.createElement('style');
      style.id = 'dark-mode-styles';
      style.textContent = `
        .epub-container {
          background-color: black !important;
        }
        .epub-view {
          background-color: black !important;
          color: white !important;
        }
        .epub-view > iframe {
          border: none !important;
          background-color: black !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        // Remove the style element when unmounting
        const element = document.getElementById('dark-mode-styles');
        if (element) element.remove();
      };
    }
  }, [theme]);
  
  // Set up rendition
  const handleRenditionReady = (rendition) => {
    console.log('Rendition ready');
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
    
    rendition.themes.register('dark', {
      body: {
        color: '#e8e8e8',
        background: '#000000'
      },
      'h1, h2, h3, h4, h5, h6': {
        color: '#ffffff'
      },
      'a': {
        color: '#81d4fa'  
      }
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
          backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
          zIndex: 1,
          flexDirection: 'column'
        }}>
          <CircularProgress color={theme === 'dark' ? 'secondary' : 'primary'} />
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 2,
              color: theme === 'dark' ? '#e8e8e8' : 'text.primary'
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
          locationChanged={handleLocationChange}
          getRendition={handleRenditionReady}
          tocChanged={(toc) => {
            tocRef.current = toc;
            tocChanged(toc);
          }}
          styles={{
            container: {
              backgroundColor: theme === 'dark' ? '#000000' : '#ffffff'
            },
            readerArea: {
              backgroundColor: theme === 'dark' ? '#000000' : '#ffffff'
            }
          }}
        />
      )}
      
      {totalPages > 0 && (
        <Box sx={{ 
          position: 'absolute', 
          bottom: 10, 
          right: 10, 
          backgroundColor: theme === 'dark' ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)', 
          color: theme === 'dark' ? '#e8e8e8' : 'inherit',
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