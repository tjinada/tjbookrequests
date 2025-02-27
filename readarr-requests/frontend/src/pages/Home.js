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
import Chip from '@mui/material/Chip';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BookCard from '../components/books/BookCard';
import AppContext from '../context/AppContext';

const Home = () => {
  const [mainTab, setMainTab] = useState(0);
  const [genreTab, setGenreTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const { 
    trendingBooks, 
    popularBooks, 
    genres, 
    genreBooks, 
    currentGenre,
    fetchHomeData, 
    fetchGenres,
    selectGenre
  } = useContext(AppContext);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchHomeData();
      await fetchGenres();
      setLoading(false);
    };

    loadData();
  }, [fetchHomeData, fetchGenres]);

  useEffect(() => {
    // When genres are loaded, select the first one
    if (genres.length > 0 && !currentGenre) {
      selectGenre(genres[0].id);
    }
  }, [genres, currentGenre, selectGenre]);

  const handleMainTabChange = (event, newValue) => {
    setMainTab(newValue);
  };

  const handleGenreTabChange = (event, newValue) => {
    setGenreTab(newValue);
    selectGenre(genres[newValue].id);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  // Render book grid for any list of books
  const renderBookGrid = (books, emptyMessage) => {
    if (!books || books.length === 0) {
      return (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6">
            {emptyMessage || "No books available right now."}
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {books.map((book) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
            <BookCard 
              book={book} 
              showEditionCount={true} // Add this prop to show edition counts
            />
          </Grid>
        ))}
      </Grid>
    );
  };

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

      {/* Main Tabs: Trending, Popular, Genres */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={mainTab} 
          onChange={handleMainTabChange} 
          aria-label="main discovery tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            icon={<TrendingUpIcon />} 
            label="Trending" 
            id="tab-0" 
            aria-controls="tabpanel-0" 
          />
          <Tab 
            icon={<StarIcon />} 
            label="Popular" 
            id="tab-1" 
            aria-controls="tabpanel-1" 
          />
          <Tab 
            icon={<MenuBookIcon />} 
            label="Genres" 
            id="tab-2" 
            aria-controls="tabpanel-2" 
          />
        </Tabs>
      </Box>

      {/* Trending Books Tab */}
      <Box role="tabpanel" hidden={mainTab !== 0} id="tabpanel-0" aria-labelledby="tab-0">
        {mainTab === 0 && (
          renderBookGrid(trendingBooks, "No trending books available right now.")
        )}
      </Box>

      {/* Popular Books Tab */}
      <Box role="tabpanel" hidden={mainTab !== 1} id="tabpanel-1" aria-labelledby="tab-1">
        {mainTab === 1 && (
          renderBookGrid(popularBooks, "No popular books available right now.")
        )}
      </Box>

      {/* Genres Tab */}
      <Box role="tabpanel" hidden={mainTab !== 2} id="tabpanel-2" aria-labelledby="tab-2">
        {mainTab === 2 && (
          <>
            {/* Genre Sub-tabs */}
            <Box sx={{ mb: 3 }}>
              <Tabs 
                value={genreTab} 
                onChange={handleGenreTabChange} 
                aria-label="genre tabs"
                variant="scrollable"
                scrollButtons="auto"
                sx={{ 
                  maxWidth: '100%',
                  '& .MuiTabs-flexContainer': {
                    flexWrap: { xs: 'wrap', md: 'nowrap' }
                  }
                }}
              >
                {genres.map((genre, index) => (
                  <Tab 
                    key={genre.id}
                    label={genre.name} 
                    id={`genre-tab-${index}`}
                    aria-controls={`genre-tabpanel-${index}`}
                    sx={{ minWidth: 'auto' }}
                  />
                ))}
              </Tabs>
            </Box>

            {/* Genre Content */}
            {genres.map((genre, index) => (
              <Box 
                key={genre.id}
                role="tabpanel" 
                hidden={genreTab !== index}
                id={`genre-tabpanel-${index}`} 
                aria-labelledby={`genre-tab-${index}`}
              >
                {genreTab === index && (
                  <>
                    {!genreBooks[genre.id] ? (
                      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                        <CircularProgress />
                      </Box>
                    ) : (
                      renderBookGrid(
                        genreBooks[genre.id], 
                        `No books found in ${genre.name} category.`
                      )
                    )}
                  </>
                )}
              </Box>
            ))}
          </>
        )}
      </Box>
    </Box>
  );
};

export default Home;