// src/pages/Home.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import api from '../utils/api';
import BookCard from '../components/books/BookCard';
import AppContext from '../context/AppContext'; // We'll create this later

const Home = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { trendingBooks,fetchHomeData } = useContext(AppContext);

  useEffect(() => {
    // If we don't have data yet, fetch it
    if (!trendingBooks.length) {
      fetchHomeData();
    } else {
      setLoading(false);
    }
  }, [trendingBooks, fetchHomeData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

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
        <Typography variant="h4" component="h1" gutterBottom>
          Discover Books
        </Typography>
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

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="book discovery tabs"
        >
          <Tab 
            icon={<TrendingUpIcon />} 
            label="Trending" 
            id="tab-0" 
            aria-controls="tabpanel-0" 
          />
        </Tabs>
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-0" aria-labelledby="tab-0">
        {activeTab === 0 && (
          <>
            <Grid container spacing={3}>
              {trendingBooks.map((book) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
                  <BookCard book={book} />
                </Grid>
              ))}
            </Grid>

            {trendingBooks.length === 0 && (
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h6">
                  No trending books available right now.
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default Home;