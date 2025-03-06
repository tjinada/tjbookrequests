// src/pages/Search.js
import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box,
  Button,
  Typography, 
  Grid, 
  CircularProgress, 
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import SearchBar from '../components/books/SearchBar';
import BookCard from '../components/books/BookCard'; // Added import
import BookRequestDialog from '../components/books/BookRequestDialog';
import EmptyState from '../components/common/EmptyState';
import SearchIcon from '@mui/icons-material/Search';
import BookIcon from '@mui/icons-material/Book';
import PersonIcon from '@mui/icons-material/Person';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';

// Create a session storage key for caching search results
const SEARCH_CACHE_KEY = 'readarr_search_state';

const Search = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Initialize state from session storage if available
  const loadCachedState = () => {
    try {
      const cachedState = sessionStorage.getItem(SEARCH_CACHE_KEY);
      if (cachedState) {
        return JSON.parse(cachedState);
      }
    } catch (err) {
      console.error('Error loading cached search state:', err);
    }
    return null;
  };
  
  const cachedState = loadCachedState();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(cachedState?.searchQuery || '');
  const [searchResults, setSearchResults] = useState(cachedState?.searchResults || []);
  const [selectedBook, setSelectedBook] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [metadataSource, setMetadataSource] = useState(cachedState?.metadataSource || 'google');
  const [hasSearched, setHasSearched] = useState(cachedState?.hasSearched || false);
  // Add search type state
  const [searchType, setSearchType] = useState(cachedState?.searchType || 'all');

  const isAdmin = user && user.role === 'admin';

  // Save search state to session storage whenever it changes
  useEffect(() => {
    const stateToCache = {
      searchQuery,
      searchResults,
      metadataSource,
      hasSearched,
      searchType
    };
    
    try {
      sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(stateToCache));
    } catch (err) {
      console.error('Error caching search state:', err);
    }
  }, [searchQuery, searchResults, metadataSource, hasSearched, searchType]);

  // Build the search query with prefix based on search type
  const buildSearchQuery = () => {
    if (!searchQuery.trim()) return '';
    
    switch(searchType) {
      case 'title':
        return `intitle:${searchQuery}`;
      case 'author':
        return `inauthor:${searchQuery}`;
      case 'all':
      default:
        return searchQuery;
    }
  };

  // Handle search
  const handleSearch = async (e) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      // Use the formatted query based on search type
      const formattedQuery = buildSearchQuery();
      
      const response = await api.get('/search/books', {
        params: {
          query: formattedQuery,
          source: metadataSource // Only admins can change this
        }
      });
      
      // Set the search results
      if (response.data && response.data.results) {
        // Handle different result formats based on source
        if (Array.isArray(response.data.results)) {
          setSearchResults(response.data.results);
        } else if (typeof response.data.results === 'object') {
          // For admin view with 'all' source that returns an object of sources
          const source = metadataSource === 'all' ? 'combined' : metadataSource;
          setSearchResults(response.data.results[source] || []);
        }
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching books:', err);
      setError('Failed to search books. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle book selection for request
  const handleRequestBook = (book) => {
    setSelectedBook(book);
    setRequestDialogOpen(true);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    
    // Also clear the cache
    try {
      sessionStorage.removeItem(SEARCH_CACHE_KEY);
    } catch (err) {
      console.error('Error clearing search cache:', err);
    }
  };

  // Handle search type change
  const handleSearchTypeChange = (event, newType) => {
    if (newType !== null) {
      setSearchType(newType);
    }
  };

  // Handle metadata source change (for admins only)
  const handleSourceChange = (e) => {
    setMetadataSource(e.target.value);
    
    // If we have an active search, re-run it with the new source
    if (searchQuery.trim() && hasSearched) {
      // Use setTimeout to allow the state update to complete
      setTimeout(() => handleSearch(), 0);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Search Books
      </Typography>

      <Paper sx={{ p: 2, mb: 4 }}>
        <form onSubmit={handleSearch}>
          <Grid container spacing={2} alignItems="center">
            {/* Search Type Toggle */}
            <Grid item xs={12} sm={12} md={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <ToggleButtonGroup
                  value={searchType}
                  exclusive
                  onChange={handleSearchTypeChange}
                  aria-label="search type"
                  size="small"
                  color="primary"
                >
                  <ToggleButton value="all" aria-label="search all">
                    <MenuBookIcon sx={{ mr: 1 }} />
                    All
                  </ToggleButton>
                  <ToggleButton value="title" aria-label="search by title">
                    <BookIcon sx={{ mr: 1 }} />
                    Title
                  </ToggleButton>
                  <ToggleButton value="author" aria-label="search by author">
                    <PersonIcon sx={{ mr: 1 }} />
                    Author
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Grid>
            
            {/* Search Bar */}
            <Grid item xs={12} sm={isAdmin ? 6 : 9} md={isAdmin ? 7 : 10}>
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSubmit={handleSearch}
                onClear={handleClearSearch}
                placeholder={
                  searchType === 'title' ? 'Search by book title...' :
                  searchType === 'author' ? 'Search by author name...' :
                  'Search for books...'
                }
              />
            </Grid>
            
            {/* Only show source selector to admins */}
            {isAdmin && (
              <Grid item xs={12} sm={3} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Source</InputLabel>
                  <Select
                    value={metadataSource}
                    label="Source"
                    onChange={handleSourceChange}
                  >
                    <MenuItem value="google">Google Books</MenuItem>
                    <MenuItem value="openLibrary">Open Library</MenuItem>
                    <MenuItem value="all">All Sources</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12} sm={3} md={2}>
              <Button
                fullWidth
                variant="contained"
                type="submit"
                startIcon={<SearchIcon />}
                disabled={!searchQuery.trim() || loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : !hasSearched ? (
        <EmptyState
          icon={SearchIcon}
          title="Search for Books"
          description={
            searchType === 'title' ? 'Enter a book title to find books you want to request.' :
            searchType === 'author' ? 'Enter an author name to find their books.' :
            'Enter a search term to find books you want to request.'
          }
        />
      ) : searchResults.length === 0 ? (
        <EmptyState
          icon={BookIcon}
          title="No Results Found"
          description={`No books found matching "${searchQuery}". Try a different search term.`}
          actionText="Try Different Search"
          onAction={() => setSearchQuery('')}
        />
      ) : (
        <Box>
          <Grid container spacing={3}>
            {searchResults.map((book) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
                <Box 
                  sx={{ 
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/book/${book.id}`)}
                >
                  <BookCard book={{...book, source: metadataSource}} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <BookRequestDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        book={selectedBook}
      />
    </Box>
  );
};

export default Search;