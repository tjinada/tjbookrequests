// src/pages/Search.js - Complete implementation with improved book cards
import React, { useState, useEffect, useContext } from 'react';
import { 
  Box,
  Button,
  Typography, 
  Grid, 
  CircularProgress, 
  Alert,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import BookIcon from '@mui/icons-material/Book';
import PersonIcon from '@mui/icons-material/Person';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import EmptyState from '../components/common/EmptyState';
import ImprovedBookCard from '../components/books/ImprovedBookCard';
import BookRequestDialog from '../components/books/BookRequestDialog';
import SearchBar from '../components/books/SearchBar';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';

const Search = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(AuthContext);
  
  // Search form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [metadataSource, setMetadataSource] = useState('google');
  
  // Results and UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  
  // Sorting and filtering
  const [sortBy, setSortBy] = useState('relevance');
  const [yearFilter, setYearFilter] = useState('all');

  const isAdmin = user && user.role === 'admin';

  // Build search query based on title and author inputs
  const buildSearchQuery = () => {
    let query = '';
    
    if (title && author) {
      // Both title and author are provided
      query = `intitle:${title} inauthor:${author}`;
    } else if (title) {
      // Only title is provided
      query = `intitle:${title}`;
    } else if (author) {
      // Only author is provided
      query = `inauthor:${author}`;
    }
    
    return query;
  };

  // Handle search submission
  const handleSearch = async (e) => {
    if (e) {
      e.preventDefault();
    }
    
    // Require at least one search field
    if (!title.trim() && !author.trim()) return;
    
    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      // Build the search query
      const query = buildSearchQuery();
      
      const response = await api.get('/search/books', {
        params: {
          query,
          source: metadataSource
        }
      });
      
      // Process search results
      if (response.data && response.data.results) {
        let processedResults = [];
        
        // Handle different result formats based on source
        if (Array.isArray(response.data.results)) {
          processedResults = response.data.results;
        } else if (typeof response.data.results === 'object') {
          // For admin view with 'all' source that returns an object of sources
          const source = metadataSource === 'all' ? 'combined' : metadataSource;
          processedResults = response.data.results[source] || [];
        }
        
        // Apply sorting if needed
        if (sortBy === 'year') {
          processedResults.sort((a, b) => {
            const yearA = a.year || (a.releaseDate ? new Date(a.releaseDate).getFullYear() : 0);
            const yearB = b.year || (b.releaseDate ? new Date(b.releaseDate).getFullYear() : 0);
            return yearB - yearA; // Newest first
          });
        } else if (sortBy === 'rating') {
          processedResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        
        setSearchResults(processedResults);
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

  // Open request dialog when book is selected
  const handleBookSelect = (book) => {
    setSelectedBook(book);
    setRequestDialogOpen(true);
  };

  // Clear all search fields
  const handleClearSearch = () => {
    setTitle('');
    setAuthor('');
    setSearchResults([]);
    setHasSearched(false);
  };

  // Update search title
  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  // Update search author
  const handleAuthorChange = (e) => {
    setAuthor(e.target.value);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Search Books
      </Typography>

      {/* Search Form */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSearch}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <SearchBar
                titleValue={title}
                authorValue={author}
                onTitleChange={handleTitleChange}
                onAuthorChange={handleAuthorChange}
                onSubmit={handleSearch}
                onClear={handleClearSearch}
                disabled={loading}
              />
              
              {/* Helper text for search requirements */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Enter at least a book title or author name to search
              </Typography>
            </Grid>
            
            {/* Search Button */}
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                type="submit"
                startIcon={<SearchIcon />}
                disabled={!title.trim() && !author.trim() || loading}
                sx={{ py: 1.5 }}
              >
                {loading ? 'Searching...' : 'Search Books'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Results Section */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : !hasSearched ? (
        <EmptyState
          icon={SearchIcon}
          title="Search for Books"
          description="Enter a book title, author name, or both to find books you want to request."
        />
      ) : searchResults.length === 0 ? (
        <EmptyState
          icon={BookIcon}
          title="No Results Found"
          description={`No books found matching your search. Try different search terms.`}
          actionText="Try Different Search"
          onAction={handleClearSearch}
        />
      ) : (
        <Box>
          {/* Results header with count and sort options */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2
          }}>
            <Typography variant="h6" component="h2">
              Search Results ({searchResults.length})
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                size="small" 
                startIcon={<SortIcon />}
                onClick={() => setSortBy(sortBy === 'relevance' ? 'rating' : 'relevance')}
              >
                {sortBy === 'relevance' ? 'Sort by Relevance' : 'Sort by Rating'}
              </Button>
            </Box>
          </Box>
          
          {/* Results grid */}
          <Grid container spacing={2}>
            {searchResults.map((book) => (
              <Grid 
                item 
                xs={12} 
                sm={isMobile ? 12 : 6} 
                md={6} 
                lg={4} 
                key={book.id}
                sx={{ height: isMobile ? 'auto' : 180 }}
              >
                <ImprovedBookCard 
                  book={{...book, source: metadataSource}} 
                  onClick={handleBookSelect}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Book Request Dialog */}
      <BookRequestDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        book={selectedBook}
      />
    </Box>
  );
};

export default Search;