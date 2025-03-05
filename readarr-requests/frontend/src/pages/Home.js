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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Rating from '@mui/material/Rating';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import RecommendIcon from '@mui/icons-material/Recommend';
import RefreshIcon from '@mui/icons-material/Refresh';
import BookCard from '../components/books/BookCard';
import AppContext from '../context/AppContext';
import CachePurger from '../components/admin/CachePurger';
import AuthContext from '../context/AuthContext';
import SwipeableBookCard from '../components/books/SwipeableBookCard';
import SwipeTutorial from '../components/common/SwipeTutorial';
import BookRequestDialog from '../components/books/BookRequestDialog';
import AnimatedGrid from '../components/layout/AnimatedGrid';
import EmptyState from '../components/common/EmptyState';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Home = () => {
  // Main tabs state
  const [mainTab, setMainTab] = useState(0);
  const [genreTab, setGenreTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const isAdmin = user && user.role === 'admin';
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // Get data and functions from context
  const { 
    trendingBooks, 
    popularBooks,
    nytBooks,
    awardBooks,
    recommendedBooks,
    genres, 
    genreBooks, 
    currentGenre,
    loading: contextLoading,
    error: contextError,
    fetchHomeData, 
    fetchGenres,
    fetchRecommendedBooks,
    selectGenre,
    yearFilter,
    setYearFilter,
    ratingFilter,
    setRatingFilter,
    filterBooks
  } = useContext(AppContext);

  // Handle book request
  const handleRequestBook = (book) => {
    setSelectedBook(book);
    setRequestDialogOpen(true);
  };

  // Set initial loading based on context loading
  useEffect(() => {
    if (!contextLoading.home && !contextLoading.genres) {
      setLoading(false);
    }
  }, [contextLoading]);

  // Set initial genre when genres are loaded
  useEffect(() => {
    if (genres.length > 0 && !currentGenre) {
      selectGenre(genres[0].id);
      // If genreTab is not in sync with current genre, update it
      if (genreTab !== genres.findIndex(g => g.id === genres[0].id)) {
        setGenreTab(0);
      }
    }
  }, [genres, currentGenre, selectGenre, genreTab]);

  // Handler for main tab changes
  const handleMainTabChange = (event, newValue) => {
    setMainTab(newValue);
    
    // If switching to the recommended tab, refresh recommendations
    if (newValue === 4 && recommendedBooks.length === 0) {
      fetchRecommendedBooks();
    }
  };

  // Handler for genre tab changes
  const handleGenreTabChange = (event, newValue) => {
    setGenreTab(newValue);
    selectGenre(genres[newValue].id);
  };

  // Handler for filter changes
  const handleYearFilterChange = (event) => {
    setYearFilter(event.target.value);
  };

  const handleRatingFilterChange = (event) => {
    setRatingFilter(event.target.value);
  };

  // Handler for refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchHomeData().then(() => {
      // If on the recommended tab, also refresh recommendations
      if (mainTab === 4) {
        fetchRecommendedBooks();
      }
      setLoading(false);
    });
  };

  // Render book grid with optional loading and empty states
  const renderBookGrid = (books, emptyMessage) => {
    const filteredBooks = filterBooks(books);
  
    if (!books) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }
  
    if (filteredBooks.length === 0) {
      return (
        <EmptyState 
          title="No books found"
          description={emptyMessage || "No books match your filters."}
          actionText="Reset Filters"
          onAction={() => {
            setYearFilter('all');
            setRatingFilter(0);
          }}
        />
      );
    }
  
    return (
      <AnimatedGrid spacing={3}>
        {filteredBooks.map((book) => (
          <SwipeableBookCard 
            book={book} 
            onRequest={handleRequestBook}
            key={book.id}
          />
        ))}
      </AnimatedGrid>
    );
  };

  // Render filter controls for books
  const renderFilters = () => (
    <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      <FormControl sx={{ minWidth: 150 }}>
        <InputLabel id="year-filter-label">Publication Era</InputLabel>
        <Select
          labelId="year-filter-label"
          id="year-filter"
          value={yearFilter}
          label="Publication Era"
          onChange={handleYearFilterChange}
          size="small"
        >
          <MenuItem value="all">All Years</MenuItem>
          <MenuItem value="recent">Last 5 Years</MenuItem>
          <MenuItem value="decade">Last 10 Years</MenuItem>
          <MenuItem value="century">21st Century</MenuItem>
          <MenuItem value="classic">Classics (Pre-1960)</MenuItem>
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 150 }}>
        <InputLabel id="rating-filter-label">Minimum Rating</InputLabel>
        <Select
          labelId="rating-filter-label"
          id="rating-filter"
          value={ratingFilter}
          label="Minimum Rating"
          onChange={handleRatingFilterChange}
          size="small"
        >
          <MenuItem value={0}>Any Rating</MenuItem>
          <MenuItem value={3}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Rating value={3} readOnly size="small" /> <Box sx={{ ml: 1 }}>& Up</Box>
            </Box>
          </MenuItem>
          <MenuItem value={3.5}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Rating value={3.5} readOnly size="small" precision={0.5} /> <Box sx={{ ml: 1 }}>& Up</Box>
            </Box>
          </MenuItem>
          <MenuItem value={4}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Rating value={4} readOnly size="small" /> <Box sx={{ ml: 1 }}>& Up</Box>
            </Box>
          </MenuItem>
          <MenuItem value={4.5}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Rating value={4.5} readOnly size="small" precision={0.5} /> <Box sx={{ ml: 1 }}>& Up</Box>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      {/* Add the cache purger for admins */}
      {isAdmin && (
        <CachePurger 
          onSuccess={() => {
            handleRefresh();
          }} 
        />
      )}

      <Button 
        size="small" 
        variant="outlined" 
        startIcon={<RefreshIcon />}
        onClick={handleRefresh}
        sx={{ height: 40 }}
      >
        Refresh
      </Button>
    </Box>
  );

  // If initial loading, show loading spinner
  if (loading && !trendingBooks.length && !genres.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{ 
          // Ensure the container doesn't interfere with scrolling
          overflowY: 'visible',
          touchAction: 'pan-y',
          // Add bottom padding to ensure content isn't hidden behind bottom nav
          pb: { xs: 8, sm: 4 }
        }}
      >
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

      {/* Filters */}
      {renderFilters()}

      {/* Error alerts */}
      {contextError.home && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {contextError.home}
        </Alert>
      )}

      {/* Main Tabs */}
      <Box 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          mb: 3,
          position: 'relative',
          zIndex: 10, // Ensure it's above content but doesn't break scrolling
          bgcolor: 'background.paper'
        }}
      >
        <Tabs 
          value={mainTab} 
          onChange={handleMainTabChange} 
          aria-label="discovery tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            // Improve touch scrolling on the tabs
            '& .MuiTabs-scroller': {
              touchAction: 'pan-x',
              overflowX: 'auto'
            }
          }}
        >
          <Tab 
            icon={<TrendingUpIcon />} 
            iconPosition="start"
            label="Trending" 
            id="tab-0" 
            aria-controls="tabpanel-0" 
          />
          <Tab 
            icon={<StarIcon />} 
            iconPosition="start"
            label="Popular" 
            id="tab-1" 
            aria-controls="tabpanel-1" 
          />
          <Tab 
            icon={<AutoAwesomeIcon />} 
            iconPosition="start"
            label="NYT Bestsellers" 
            id="tab-2" 
            aria-controls="tabpanel-2" 
          />
          <Tab 
            icon={<EmojiEventsIcon />} 
            iconPosition="start"
            label="Award Winners" 
            id="tab-3" 
            aria-controls="tabpanel-3" 
          />
          <Tab 
            icon={<RecommendIcon />} 
            iconPosition="start"
            label="Recommended" 
            id="tab-4" 
            aria-controls="tabpanel-4" 
          />
          <Tab 
            icon={<LocalLibraryIcon />} 
            iconPosition="start"
            label="Genres" 
            id="tab-5" 
            aria-controls="tabpanel-5" 
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={mainTab} index={0}>
        {renderBookGrid(trendingBooks, "No trending books match your filters.")}
      </TabPanel>

      <TabPanel value={mainTab} index={1}>
        {renderBookGrid(popularBooks, "No popular books match your filters.")}
      </TabPanel>

      <TabPanel value={mainTab} index={2}>
        {renderBookGrid(nytBooks, "No NYT bestsellers match your filters.")}
      </TabPanel>

      <TabPanel value={mainTab} index={3}>
        {renderBookGrid(awardBooks, "No award-winning books match your filters.")}
      </TabPanel>

      {/* New Recommended tab */}
      <TabPanel value={mainTab} index={4}>
        {contextLoading.recommended ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : recommendedBooks && recommendedBooks.length > 0 ? (
          renderBookGrid(recommendedBooks, "No recommended books match your filters.")
        ) : (
          <EmptyState 
            icon={RecommendIcon}
            title="No Recommendations Yet"
            description="As you request books, we'll learn your preferences and recommend similar books you might enjoy. Try requesting a few books first!"
            actionText="Find Books to Request"
            onAction={() => setMainTab(1)} // Switch to Popular tab
          />
        )}
      </TabPanel>

      <TabPanel value={mainTab} index={5}>
        {/* Genre Sub-tabs */}
        {genres.length > 0 ? (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
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
                    sx={{ minWidth: { xs: 120, md: 'auto' } }}
                  />
                ))}
              </Tabs>
            </Box>

            {/* Genre Tab Contents */}
            {genres.map((genre, index) => (
              <div 
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
                        `No ${genre.name} books match your filters.`
                      )
                    )}
                  </>
                )}
              </div>
            ))}
          </>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        )}
      </TabPanel>
      
      {selectedBook && (
        <BookRequestDialog
          open={requestDialogOpen}
          onClose={() => setRequestDialogOpen(false)}
          book={selectedBook}
        />
      )}
      
      <SwipeTutorial />
    </Box>
  );
};

export default Home;