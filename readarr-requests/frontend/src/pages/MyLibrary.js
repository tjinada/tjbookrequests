// src/pages/MyLibrary.js
import React, { useState, useEffect, useContext } from 'react';
import { 
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  Chip
} from '@mui/material';
import LibraryContext from '../context/LibraryContext';
import LibraryBookActions from '../components/library/LibraryBookActions';
import noImage from '../assets/no-image.png';

const MyLibrary = () => {
  const { myBooks, loading, error, fetchMyLibrary } = useContext(LibraryContext);
  
  // Load library books on component mount
  useEffect(() => {
    fetchMyLibrary();
  }, [fetchMyLibrary]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Library
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Browse and read your available books
      </Typography>
      
      {myBooks.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Your library is empty
          </Typography>
          <Typography variant="body1">
            Books you request will appear here once they're available.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {myBooks.map(book => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}>
                <CardMedia
                  component="img"
                  image={book.cover || noImage}
                  alt={book.title}
                  sx={{ 
                    height: 200, 
                    objectFit: 'cover',
                    objectPosition: 'center top'
                  }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {book.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    by {book.author}
                  </Typography>
                  
                  {book.formats && book.formats.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {book.formats.map(format => (
                        <Chip 
                          key={format} 
                          label={format}
                          size="small"
                          color={format === 'EPUB' ? 'primary' : 'default'}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <LibraryBookActions book={book} />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MyLibrary;