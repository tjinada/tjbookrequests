// src/pages/Home.js
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import StarIcon from '@mui/icons-material/Star';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import RefreshIcon from '@mui/icons-material/Refresh';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AppContext from '../context/AppContext';
import AuthContext from '../context/AuthContext';
import CachePurger from '../components/admin/CachePurger';
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
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useContext(AuthContext);
  const isAdmin = user && user.role === 'admin';
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const navigate = useNavigate();

  // Get data and functions from context
  const { 
    popularBooks,
    nytBooks,
    awardBooks,
    recentBooks,
    personalizedBooks,
    fetchHomeData,
    fetchPersonalizedRecommendations,
    yearFilter,
    setYearFilter,
    ratingFilter,
    setRatingFilter,
    filterBooks,
    loading: contextLoading,
    error: contextError,
  } = useContext(AppContext);

  // Handle book request
  const handleRequestBook = (book) => {
    setSelectedBook(book);
    setRequestDialogOpen(true);
  };

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchHomeData();
      if (isAuthenticated) {
        await fetchPersonalizedRecommendations();
      }
      setLoading(false);
    };

    loadData();
  }, [fetchHomeData, fetchPersonalizedRecommendations, isAuthenticated]);

  // Handler for main tab changes
  const handleMainTabChange = (event, newValue) => {
    setMainTab(newValue);
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
    Promise.all([
      fetchHomeData(),
      isAuthenticated && fetchPersonalizedRecommendations()
    ]).finally(() => setLoading(false));
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
      <AnimatedGrid 
        spacing={2} // Reduced spacing from 3 to 2
        sx={{ 
          width: '100%',
          mx: 0,
          px: 0
        }}
        itemProps={{ 
          xs: 6, // Ensure 2 items per row on mobile
          sx: { px: { xs: 1 } } // Reduced padding for each item
        }}
      >
        {filteredBooks.map((book) => (
          <SwipeableBookCard 
            book={book} 
            onRequest={handleRequestBook}
            key={book.id}
          />
        ))}
      </AnimatedGrid>
    );

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
  if (loading && !popularBooks.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  // Calculate if the "For You" tab should be shown
  const showForYouTab = isAuthenticated && personalizedBooks && personalizedBooks.length > 0;
  
  // Adjust tab indices if For You tab is shown
  const tabIndices = {
    forYou: 0,
    popular: showForYouTab ? 1 : 0,
    nyt: showForYouTab ? 2 : 1,
    awards: showForYouTab ? 3 : 2,
    recent: showForYouTab ? 4 : 3
  };

  return (
    <Box sx={{ 
      px: { xs: 1, sm: 2 }, // Reduce horizontal padding
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden', // Prevent any horizontal scrolling
      // Add bottom padding to ensure content isn't hidden behind bottom nav
      pb: { xs: 8, sm: 4 }
    }}>
      <Box
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 4,
          mt: 1
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 600,
            letterSpacing: '-0.5px'
          }}
        >
          Discover Books
        </Typography>
        
        <Button 
          variant="contained" 
          component={Link} 
          to="/search" 
          startIcon={<SearchIcon />}
          sx={{
            borderRadius: '50px',
            px: 2,
            py: 1
          }}
        >
          Search
        </Button>
      </Box>
  
      {/* Remove filters section and keep only refresh */}
      {isAdmin && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <CachePurger onSuccess={handleRefresh} />
        </Box>
      )}
  
      {/* Improved tabs styling */}
      <Box 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          mb: 4,
          position: 'relative',
          zIndex: 10,
          bgcolor: 'background.paper',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
        }}
      >
      <Tabs 
        value={mainTab} 
        onChange={handleMainTabChange} 
        aria-label="discovery tabs"
        variant="scrollable"
        scrollButtons="auto"
        TabIndicatorProps={{
          style: {
            height: '3px',
            borderRadius: '3px 3px 0 0'
          }
        }}
        sx={{
          '& .MuiTab-root': {
            minWidth: 100,
            fontSize: '0.95rem',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            mx: 0.5,
            '&.Mui-selected': {
              fontWeight: 700,
              color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
            }
          }
        }}
      >
          {showForYouTab && (
            <Tab 
              icon={<FavoriteIcon />} 
              iconPosition="start"
              label="For You" 
              id={`tab-${tabIndices.forYou}`} 
              aria-controls={`tabpanel-${tabIndices.forYou}`} 
            />
          )}
          
          <Tab 
            icon={<StarIcon />} 
            iconPosition="start"
            label="Popular" 
            id={`tab-${tabIndices.popular}`} 
            aria-controls={`tabpanel-${tabIndices.popular}`} 
          />
          <Tab 
            icon={<AutoAwesomeIcon />} 
            iconPosition="start"
            label="NYT Bestsellers" 
            id={`tab-${tabIndices.nyt}`} 
            aria-controls={`tabpanel-${tabIndices.nyt}`} 
          />
          <Tab 
            icon={<EmojiEventsIcon />} 
            iconPosition="start"
            label="Award Winners" 
            id={`tab-${tabIndices.awards}`} 
            aria-controls={`tabpanel-${tabIndices.awards}`} 
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {/* For You Panel */}
      {showForYouTab && (
        <TabPanel value={mainTab} index={tabIndices.forYou}>
          <Box sx={{ mb: 3, width: '100%', px: 0 }}>
            <Typography variant="h6" gutterBottom>
              Personalized Recommendations
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Books selected just for you based on your requests and preferences
            </Typography>
          </Box>
          {contextLoading.personalized ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : contextError.personalized ? (
            <Alert 
              severity="error" 
              action={
                <Button color="inherit" size="small" onClick={fetchPersonalizedRecommendations}>
                  Retry
                </Button>
              }
              sx={{ width: '100%' }}
            >
              {contextError.personalized}
            </Alert>
          ) : (
            renderBookGrid(personalizedBooks, "No personalized books match your filters.")
          )}
        </TabPanel>
      )}

      <TabPanel value={mainTab} index={tabIndices.popular}>
        {renderBookGrid(popularBooks, "No popular books match your filters.")}
      </TabPanel>

      <TabPanel value={mainTab} index={tabIndices.nyt}>
        {renderBookGrid(nytBooks, "No NYT bestsellers match your filters.")}
      </TabPanel>

      <TabPanel value={mainTab} index={tabIndices.awards}>
        {renderBookGrid(awardBooks, "No award-winning books match your filters.")}
      </TabPanel>

      <TabPanel value={mainTab} index={tabIndices.recent}>
        {renderBookGrid(recentBooks, "No recent books match your filters.")}
      </TabPanel>
      
      {/* Not authenticated - For You CTA */}
      {!isAuthenticated && mainTab === 0 && (
        <Box sx={{ mt: 4, p: 3, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
          <Typography variant="h6" gutterBottom>
            Get Personalized Recommendations
          </Typography>
          <Typography variant="body1" paragraph>
            Sign in to see book recommendations tailored just for you based on your preferences.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/login')}
            startIcon={<FavoriteIcon />}
          >
            Sign In For Personalized Books
          </Button>
        </Box>
      )}
      
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
}

export default Home;