// src/components/library/EpubReader.js
import React, { useRef, useState, useEffect } from 'react';
import { ReactReader } from 'react-reader';
import { Box, CircularProgress, Typography } from '@mui/material';

const EpubReader = ({ url, fontSize = 100 }) => {
  const [location, setLocation] = useState(null);
  const [rendition, setRendition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  
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
    
    // Loading is complete
    setLoading(false);
  };
  
  // Update font size when it changes
  useEffect(() => {
    if (rendition) {
      rendition.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize, rendition]);
  
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
      
      <ReactReader
        url={url}
        title={""}
        location={location}
        locationChanged={locationChanged}
        getRendition={getRendition}
        showToc={false}
        epubInitOptions={{
          openAs: 'epub'
        }}
        styles={{
          container: {
            height: '100%',
            width: '100%'
          },
          readerArea: {
            height: '100%',
            width: '100%',
            backgroundColor: '#fff'
          }
        }}
      />
      
      {totalPages > 0 && (
        <Box sx={{ 
          position: 'absolute', 
          bottom: 10, 
          right: 10, 
          backgroundColor: 'rgba(255,255,255,0.8)', 
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