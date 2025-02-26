// src/pages/Home.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import api from '../utils/api';
import BookCard from '../components/books/BookCard';

const Home = () => {
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrendingBooks = async () => {
      try {
        const res = await api.get('/books/latest');
        setTrendingBooks(res.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load trending books');
        setLoading(false);
      }
    };

    fetchTrendingBooks();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Trending Books
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          component={Link} 
          to="/search" 
          startIcon={<SearchIcon />}
        >
          Search Books
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {trendingBooks.map((book) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
            <BookCard book={book} />
          </Grid>
        ))}
      </Grid>

      {trendingBooks.length === 0 && !error && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6">
            No trending books available. Try refreshing or search for books!
          </Typography>
          <Button 
            variant="contained" 
            component={Link} 
            to="/search"
            startIcon={<SearchIcon />}
            sx={{ mt: 2 }}
          >
            Search Books
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Home;