// src/components/library/EmptyLibraryState.js
import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import SearchIcon from '@mui/icons-material/Search';

const EmptyLibraryState = () => {
  return (
    <Paper elevation={1} sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
      <LocalLibraryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.6 }} />
      
      <Typography variant="h5" gutterBottom>
        Your Library is Empty
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Your library will show books that you have added to your collection.
        Request books to add them to your library.
      </Typography>
      
      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to="/search"
          startIcon={<SearchIcon />}
          sx={{ mr: 2 }}
        >
          Search Books
        </Button>
        
        <Button
          variant="outlined"
          component={Link}
          to="/requests"
        >
          View My Requests
        </Button>
      </Box>
    </Paper>
  );
};

export default EmptyLibraryState;