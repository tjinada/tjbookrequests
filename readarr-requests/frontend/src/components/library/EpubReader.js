// src/components/library/EpubReader.js
import React, { useRef, useState, useEffect } from 'react';
import { ReactReader, ReactReaderStyle } from 'react-reader';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import api from '../../utils/api';

// Define light and dark reader themes
const lightReaderTheme = {
  ...ReactReaderStyle,
  readerArea: {
    ...ReactReaderStyle.readerArea,
    transition: undefined,
  }
};

const darkReaderTheme = {
  ...ReactReaderStyle,
  arrow: {
    ...ReactReaderStyle.arrow,
    color: 'white',
  },
  arrowHover: {
    ...ReactReaderStyle.arrowHover,
    color: '#ccc',
  },
  readerArea: {
    ...ReactReaderStyle.readerArea,
    backgroundColor: '#222',
    transition: undefined,
  },
  titleArea: {
    ...ReactReaderStyle.titleArea,
    color: '#ccc',
  },
  tocArea: {
    ...ReactReaderStyle.tocArea,
    background: '#333',
  },
  tocButtonExpanded: {
    ...ReactReaderStyle.tocButtonExpanded,
    background: '#444',
  },
  tocButtonBar: {
    ...ReactReaderStyle.tocButtonBar,
    background: '#fff',
  },
  tocButton: {
    ...ReactReaderStyle.tocButton,
    color: 'white',
  }
};

// Helper function to update theme in rendition
const updateTheme = (rendition, theme) => {
  if (!rendition) return;
  
  const themes = rendition.themes;
  switch (theme) {
    case 'dark': {
      themes.override('color', '#fff');
      themes.override('background', '#222');
      break;
    }
    case 'sepia': {
      themes.override('color', '#5B4636');
      themes.override('background', '#FBF0D9');
      break;
    }
    case 'light':
    default: {
      themes.override('color', '#000');
      themes.override('background', '#fff');
      break;
    }
  }
};

const EpubReader = ({ 
  url, 
  fontSize = 100, 
  theme = 'light',
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
  const renditionRef = useRef(null);
  
  // Get theme-dependent styles
  const getReaderTheme = () => {
    switch (theme) {
      case 'dark':
        return darkReaderTheme;
      case 'light':
      default:
        return lightReaderTheme;
    }
  };
  
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
  
  // Set up rendition
  const handleRenditionReady = (rendition) => {
    console.log('Rendition ready');
    // Store rendition for later use
    renditionRef.current = rendition;
    setRendition(rendition);
    
    // Apply font size
    rendition.themes.fontSize(`${fontSize}%`);
    
    // Apply theme
    updateTheme(rendition, theme);
    
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
    if (renditionRef.current) {
      updateTheme(renditionRef.current, theme);
    }
  }, [theme]);
  
  const handleLoadError = (error) => {
    console.error('Error loading EPUB:', error);
    setError(`Error loading book: ${error.message}`);
    setLoading(false);
  };
  
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
          backgroundColor: theme === 'dark' ? 'rgba(34,34,34,0.9)' : 'rgba(255,255,255,0.9)',
          zIndex: 1,
          flexDirection: 'column'
        }}>
          <CircularProgress />
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 2,
              color: theme === 'dark' ? '#ccc' : 'inherit'
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
          epubOptions={{
            flow: 'paginated',
            manager: 'continuous'
          }}
          readerStyles={getReaderTheme()}
          styles={{
            container: {
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