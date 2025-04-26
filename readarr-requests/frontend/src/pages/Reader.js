// src/pages/Reader.js
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import BookReader from '../components/reader/BookReader';
import api from '../utils/api';

/**
 * Reader page component that hosts the BookReader
 * This component handles cleanup on unmount and tracks reading activity
 */
const Reader = () => {
  const { id, format } = useParams();
  const navigate = useNavigate();
  
  // Track reading activity once when the component mounts
  useEffect(() => {
    if (id) {
      // Track that the user is reading this book
      try {
        api.post(`/api/reader/${id}/track`);
      } catch (error) {
        console.error('Failed to track reading activity:', error);
        // Don't show error to user, just log it
      }
    }
  }, [id]);
  
  // On mount, hide any app UI elements that might interfere with reading
  useEffect(() => {
    // Save current body style
    const originalOverflow = document.body.style.overflow;
    
    // Set body style to prevent scrolling of the main page
    document.body.style.overflow = 'hidden';
    
    // Find and hide any bottom navigation or fixed elements
    const bottomNav = document.querySelector('.MuiBottomNavigation-root');
    if (bottomNav) {
      bottomNav.style.display = 'none';
    }
    
    // Cleanup function to restore original styles when component unmounts
    return () => {
      document.body.style.overflow = originalOverflow;
      
      if (bottomNav) {
        bottomNav.style.display = '';
      }
    };
  }, []);
  
  // If no book ID is provided, go back to the library
  if (!id) {
    navigate('/library');
    return null;
  }
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1300, // Higher than the app bar and drawer
        bgcolor: 'background.default',
      }}
    >
      <BookReader />
    </Box>
  );
};

export default Reader;