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
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import AppContext from '../context/AppContext';
import AuthContext from '../context/AuthContext';
import CachePurger from '../components/admin/CachePurger';
import SwipeableBookCard from '../components/books/SwipeableBookCard';
import SwipeTutorial from '../components/common/SwipeTutorial';
import BookRequestDialog from '../components/books/BookRequestDialog';
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
        <Box sx={{ py: 2 }}>
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
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
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
      <Grid container spacing={2}>
        {filteredBooks.map((book) => (
          <Grid item xs={6} key={book.id} sx={{ height: '100%' }}>
            <SwipeableBookCard 
              book={book} 
              onRequest={handleRequestBook}
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  // Render filter controls for books
  const renderFilters = () => (
    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      <FormControl sx={{ minWidth: 130, flexGrow: 1 }} size="small">
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

      <FormControl sx={{ minWidth: 130, flexGrow: 1 }} size="small">
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
    <Box sx={{ px: { xs: 2, sm: 2, md: 3 } }}> {/* Reduced side margins */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          mt: 1
        }}
      >
        <Typography variant="h5" component="h1">
          Discover Books
        </Typography>
        <Button 
          variant="contained" 
          component={Link} 
          to="/search" 
          startIcon={<SearchIcon />}
          size="small"
        >
          Search
        </Button>
      </Box>

      {/* Filters */}
      {renderFilters()}

      {/* Main Tabs */}
      <Box 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          mb: 2,
          position: 'sticky',
          top: 0,
          zIndex: 10,
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
            '& .MuiTabs-scroller': {
              touchAction: 'pan-x',
              overflowX: 'auto'
            },
            '& .MuiTab-root': {
              minWidth: 'auto',
              px: 2,
              py: 1
            },
            '& .Mui-selected': {
              bgcolor: 'rgba(144, 202, 249, 0.1)'
            },
            '& .MuiTabs-indicator': {
              height: 3
            }
          }}
        >
          {/* For You Tab - Only show when user is authenticated and has recommendations */}
          {showForYouTab && (
            <Tab 
              icon={<FavoriteIcon />} 
              iconPosition="start"
              label="FOR YOU" 
              id={`tab-${tabIndices.forYou}`} 
              aria-controls={`tabpanel-${tabIndices.forYou}`} 
            />
          )}
          
          <Tab 
            icon={<StarIcon />} 
            iconPosition="start"
            label="POPULAR" 
            id={`tab-${tabIndices.popular}`} 
            aria-controls={`tabpanel-${tabIndices.popular}`} 
          />
          <Tab 
            icon={<AutoAwesomeIcon />} 
            iconPosition="start"
            label="BESTSELLERS" 
            id={`tab-${tabIndices.nyt}`} 
            aria-controls={`tabpanel-${tabIndices.nyt}`} 
          />
          <Tab 
            icon={<EmojiEventsIcon />} 
            iconPosition="start"
            label="AWARDS" 
            id={`tab-${tabIndices.awards}`} 
            aria-controls={`tabpanel-${tabIndices.awards}`} 
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {/* For You Panel */}
      {showForYouTab && (
        <TabPanel value={mainTab} index={tabIndices.forYou}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 2,
            mt: -1
          }}>
            <Typography variant="subtitle1" fontWeight="medium">
              Personalized For You
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: 'primary.main',
              typography: 'caption' 
            }}>
              Swipe for more <KeyboardArrowRightIcon fontSize="small" />
            </Box>
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
            >
              {contextError.personalized}
            </Alert>
          ) : (
            renderBookGrid(personalizedBooks, "No personalized books match your filters.")
          )}
        </TabPanel>
      )}

      <TabPanel value={mainTab} index={tabIndices.popular}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          mb: 1,
          mt: -1
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: 'primary.main',
            typography: 'caption' 
          }}>
            Swipe for more <KeyboardArrowRightIcon fontSize="small" />
          </Box>
        </Box>
        {renderBookGrid(popularBooks, "No popular books match your filters.")}
      </TabPanel>

      <TabPanel value={mainTab} index={tabIndices.nyt}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          mb: 1,
          mt: -1
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: 'primary.main',
            typography: 'caption' 
          }}>
            Swipe for more <KeyboardArrowRightIcon fontSize="small" />
          </Box>
        </Box>
        {renderBookGrid(nytBooks, "No bestsellers match your filters.")}
      </TabPanel>

      <TabPanel value={mainTab} index={tabIndices.awards}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          mb: 1,
          mt: -1
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: 'primary.main',
            typography: 'caption' 
          }}>
            Swipe for more <KeyboardArrowRightIcon fontSize="small" />
          </Box>
        </Box>
        {renderBookGrid(awardBooks, "No award-winning books match your filters.")}
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
            Sign In For Recommendations
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

export default Home;