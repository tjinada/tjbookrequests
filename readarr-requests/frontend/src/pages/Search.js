// src/pages/Search.js
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import BookIcon from '@mui/icons-material/Book';
import PersonIcon from '@mui/icons-material/Person';
import BookRequestDialog from '../components/books/BookRequestDialog';
import EmptyState from '../components/common/EmptyState';
import BookCard from '../components/books/BookCard';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';

const Search = () => {
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

  // Clear all search fields
  const handleClearSearch = () => {
    setTitle('');
    setAuthor('');
    setSearchResults([]);
    setHasSearched(false);
  };

  // Handle changes to the metadata source (for admins)
  const handleSourceChange = (e) => {
    setMetadataSource(e.target.value);
    
    // Rerun search if there's an active search
    if ((title.trim() || author.trim()) && hasSearched) {
      // Use setTimeout to allow the state update to complete
      setTimeout(() => handleSearch(), 0);
    }
  };

  // Clear a specific field
  const clearField = (field) => {
    if (field === 'title') {
      setTitle('');
    } else if (field === 'author') {
      setAuthor('');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Search Books
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSearch}>
          <Grid container spacing={2}>
            {/* Book Title Field */}
            <Grid item xs={12} sm={isAdmin ? 6 : 6} md={isAdmin ? 5 : 6}>
              <TextField
                fullWidth
                label="Book Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter book title"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BookIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: title && (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => clearField('title')}
                        size="small"
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            {/* Author Field */}
            <Grid item xs={12} sm={isAdmin ? 6 : 6} md={isAdmin ? 5 : 6}>
              <TextField
                fullWidth
                label="Author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Enter author name"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: author && (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => clearField('author')}
                        size="small"
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            {/* Source Selector (Admin only) */}
            {isAdmin && (
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
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
            
            {/* Search Button */}
            <Grid item xs={12} sm={6} md={isAdmin ? 12 : 12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
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
                
                {(title || author) && (
                  <Button 
                    variant="outlined"
                    onClick={handleClearSearch}
                    disabled={loading}
                    sx={{ py: 1.5 }}
                  >
                    Clear
                  </Button>
                )}
              </Box>
              
              {/* Helper text for search requirements */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Enter at least a book title or author name to search
              </Typography>
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
          <Typography variant="h6" gutterBottom>
            Search Results ({searchResults.length})
          </Typography>
          
          <Grid container spacing={3}>
            {searchResults.map((book) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
                <Box 
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleRequestBook(book)}
                >
                  <BookCard book={{...book, source: metadataSource}} />
                </Box>
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