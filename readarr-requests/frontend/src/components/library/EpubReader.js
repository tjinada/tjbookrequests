// src/components/library/EpubReader.js
import React, { useRef, useState, useEffect } from 'react';
import { ReactReader } from 'react-reader';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import api from '../../utils/api';

const EpubReader = ({ 
  url, 
  fontSize = 100, 
  theme = 'light',
  fontFamily = 'serif',
  lineSpacing = 1.5,
  margin = 20,
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
  
  // Set up rendition
  const handleRenditionReady = (rendition) => {
    console.log('Rendition ready');
    // Store rendition for later use
    renditionRef.current = rendition;
    setRendition(rendition);
    
    // Register themes
    registerThemes(rendition);
    
    // Apply theme
    rendition.themes.select(theme);
    
    // Apply font size
    rendition.themes.fontSize(`${fontSize}%`);
    
    // Apply font family
    rendition.themes.font(fontFamily);
    
    // Apply line spacing
    applyLineSpacing(rendition, lineSpacing);
    
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
    
    // Apply global CSS to fix navigation elements
    applyGlobalReaderCSS(theme);
    
    // Loading is complete
    setLoading(false);
  };
  
  // Register all themes
  const registerThemes = (rendition) => {
    // Light theme (default)
    rendition.themes.register('light', {
      body: {
        color: '#000',
        background: '#fff'
      },
      'img': {
        filter: 'none'
      },
      'a': {
        color: '#0066cc',
        'text-decoration': 'none'
      }
    });
    
    // Sepia theme
    rendition.themes.register('sepia', {
      body: {
        color: '#5B4636',
        background: '#FBF0D9'
      },
      'img': {
        filter: 'sepia(30%)'
      },
      'a': {
        color: '#704214',
        'text-decoration': 'none'
      }
    });
    
    // Dark theme
    rendition.themes.register('dark', {
      body: {
        color: '#c4c4c4',
        background: '#222'
      },
      '*': {
        'color': '#c4c4c4 !important'
      },
      'h1, h2, h3, h4, h5, h6': {
        color: '#eee !important'
      },
      'img': {
        filter: 'brightness(0.8) contrast(1.2)'
      },
      'a': {
        color: '#88ccff !important',
        'text-decoration': 'none'
      }
    });
  };
  
  // Apply line spacing
  const applyLineSpacing = (rendition, spacing) => {
    rendition.themes.override('line-height', `${spacing}`);
  };
  
  // Apply global CSS to fix the ReactReader component styling
  const applyGlobalReaderCSS = (theme) => {
    // Check if the style element already exists
    let styleElement = document.getElementById('epub-reader-style');
    
    // If not, create it
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'epub-reader-style';
      document.head.appendChild(styleElement);
    }
    
    // Get background and text colors based on theme
    const backgroundColor = theme === 'dark' ? '#222' : 
                            theme === 'sepia' ? '#FBF0D9' : '#fff';
    const textColor = theme === 'dark' ? '#c4c4c4' : 
                      theme === 'sepia' ? '#5B4636' : '#000';
    const arrowColor = theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
    
    // Define the CSS
    styleElement.innerHTML = `
      /* ReactReader container styles */
      .ReactReader {
        background-color: ${backgroundColor} !important;
        color: ${textColor} !important;
      }
      
      /* Navigation buttons (next, prev arrows) */
      .ReactReader__arrow {
        color: ${arrowColor} !important;
        background-color: transparent !important;
        box-shadow: none !important;
      }
      
      /* Navigation container */
      .ReactReader__container {
        background-color: ${backgroundColor} !important;
      }
      
      /* Navigation controls */
      .ReactReader__control {
        background-color: ${backgroundColor} !important;
      }
      
      /* Pagination control */
      .ReactReader__control > div {
        color: ${textColor} !important;
      }
      
      /* Hamburger menu button */
      .ReactReader__menu-button {
        color: ${arrowColor} !important;
      }
      
      /* TOC panel */
      .ReactReader__toc {
        background-color: ${backgroundColor} !important;
        color: ${textColor} !important;
        border-right: 1px solid ${theme === 'dark' ? '#444' : '#ddd'} !important;
      }
      
      /* TOC items */
      .ReactReader__toc-item {
        color: ${textColor} !important;
      }
      
      /* TOC active item */
      .ReactReader__toc-item--active {
        color: ${theme === 'dark' ? '#88ccff' : '#0066cc'} !important;
      }
      
      /* iframe, if any */
      .ReactReader__container iframe {
        background-color: ${backgroundColor} !important;
      }
    `;
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
      // Also update the global reader CSS
      applyGlobalReaderCSS(theme);
    }
  }, [theme, rendition]);
  
  // Update font family when it changes
  useEffect(() => {
    if (rendition) {
      rendition.themes.font(fontFamily);
    }
  }, [fontFamily, rendition]);
  
  // Update line spacing when it changes
  useEffect(() => {
    if (rendition) {
      applyLineSpacing(rendition, lineSpacing);
    }
  }, [lineSpacing, rendition]);
  
  // Get background color based on theme
  const getBackgroundColor = () => {
    if (theme === 'dark') return '#222';
    if (theme === 'sepia') return '#FBF0D9';
    return '#fff';
  };
  
  // Get text color based on theme
  const getTextColor = () => {
    if (theme === 'dark') return '#c4c4c4';
    if (theme === 'sepia') return '#5B4636';
    return '#000';
  };
  
  const handleLoadError = (error) => {
    console.error('Error loading EPUB:', error);
    setError(`Error loading book: ${error.message}`);
    setLoading(false);
  };
  
  return (
    <Box sx={{ 
      height: '100%', 
      position: 'relative',
      bgcolor: getBackgroundColor()
    }}>
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
          backgroundColor: getBackgroundColor(),
          zIndex: 1,
          flexDirection: 'column'
        }}>
          <CircularProgress color={theme === 'dark' ? 'secondary' : 'primary'} />
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 2,
              color: getTextColor()
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
          styles={{
            container: {
              height: '100%',
              width: '100%',
              backgroundColor: getBackgroundColor()
            },
            readerArea: {
              height: '100%',
              width: '100%',
              backgroundColor: getBackgroundColor()
            },
            arrow: {
              color: theme === 'dark' ? '#fff' : '#000',
              opacity: 0.7
            }
          }}
          showToc={false} // Hide default TOC since we're using our own
          swipeable={true}
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
          backgroundColor: theme === 'dark' ? 'rgba(50,50,50,0.8)' : 
                            theme === 'sepia' ? 'rgba(251,240,217,0.8)' : 'rgba(255,255,255,0.8)', 
          color: getTextColor(),
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