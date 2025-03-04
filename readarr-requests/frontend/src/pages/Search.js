// src/pages/Search.js
import React, { useState, useEffect, useContext } from 'react';
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
  Tabs,
  Tab,
  Divider,
  Chip
} from '@mui/material';
import SearchBar from '../components/books/SearchBar';
import SwipeableBookCard from '../components/books/SwipeableBookCard';
import BookRequestDialog from '../components/books/BookRequestDialog';
import EmptyState from '../components/common/EmptyState';
import SearchIcon from '@mui/icons-material/Search';
import BookIcon from '@mui/icons-material/Book';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';

const Search = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    google: [],
    openLibrary: [],
    combined: []
  });
  const [selectedBook, setSelectedBook] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [metadataSource, setMetadataSource] = useState('all');
  const [activeTab, setActiveTab] = useState('combined');
  const [hasSearched, setHasSearched] = useState(false);

  const isAdmin = user && user.role === 'admin';

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      const response = await api.get('/search/books', {
        params: {
          query: searchQuery,
          source: metadataSource
        }
      });
      
      // Check if we have results
      if (metadataSource === 'all') {
        setSearchResults({
          google: response.data.results.google || [],
          openLibrary: response.data.results.openLibrary || [],
          combined: response.data.results.combined || []
        });
        
        // Auto-select the tab with the most results
        if (response.data.results.combined.length === 0) {
          if ((response.data.results.google || []).length >= (response.data.results.openLibrary || []).length) {
            setActiveTab('google');
          } else {
            setActiveTab('openLibrary');
          }
        } else {
          setActiveTab('combined');
        }
      } else {
        // For single source, just set that source
        setSearchResults({
          ...searchResults,
          [metadataSource]: response.data.results || []
        });
        setActiveTab(metadataSource);
      }
    } catch (err) {
      console.error('Error searching books:', err);
      setError('Failed to search books. Please try again.');
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
    setSearchResults({
      google: [],
      openLibrary: [],
      combined: []
    });
    setHasSearched(false);
  };

  // Handle metadata source change
  const handleSourceChange = (e) => {
    setMetadataSource(e.target.value);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Get the current results based on active tab
  const getCurrentResults = () => {
    return searchResults[activeTab] || [];
  };

  // Function to render the availability badge on book cards
  const renderReadarrBadge = (book) => {
    if (book.readarrInfo?.inReadarr) {
      return (
        <Chip 
          label="In Library" 
          color="success" 
          size="small" 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            left: 8,
            zIndex: 1
          }}
        />
      );
    } else if (book.readarrInfo?.authorInReadarr) {
      return (
        <Chip 
          label="Author in Library" 
          color="info" 
          size="small" 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            left: 8,
            zIndex: 1
          }}
        />
      );
    }
    return null;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Search Books
      </Typography>

      <Paper sx={{ p: 2, mb: 4 }}>
        <form onSubmit={handleSearch}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={7}>
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSubmit={handleSearch}
                onClear={handleClearSearch}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Metadata Source</InputLabel>
                <Select
                  value={metadataSource}
                  label="Metadata Source"
                  onChange={handleSourceChange}
                >
                  <MenuItem value="all">All Sources</MenuItem>
                  <MenuItem value="google">Google Books</MenuItem>
                  <MenuItem value="openLibrary">Open Library</MenuItem>
                </Select>
              </FormControl>
            </Grid>
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
          description="Enter a search term to find books you want to request."
        />
      ) : searchResults.google.length === 0 && 
          searchResults.openLibrary.length === 0 && 
          searchResults.combined.length === 0 ? (
        <EmptyState
          icon={BookIcon}
          title="No Results Found"
          description={`No books found matching "${searchQuery}". Try a different search term or source.`}
          actionText="Try Different Search"
          onAction={() => setSearchQuery('')}
        />
      ) : (
        <Box>
          {metadataSource === 'all' && (
            <Box sx={{ mb: 3 }}>
              <Paper sx={{ width: '100%' }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  centered
                >
                  <Tab 
                    label={`Combined (${searchResults.combined.length})`} 
                    value="combined" 
                  />
                  <Tab 
                    label={`Google Books (${searchResults.google.length})`} 
                    value="google" 
                  />
                  <Tab 
                    label={`Open Library (${searchResults.openLibrary.length})`} 
                    value="openLibrary" 
                  />
                </Tabs>
              </Paper>
            </Box>
          )}

          <Grid container spacing={3}>
            {getCurrentResults().map((book) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
                <Box sx={{ position: 'relative' }}>
                  {renderReadarrBadge(book)}
                  <SwipeableBookCard
                    book={book}
                    onRequest={() => handleRequestBook(book)}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>

          {getCurrentResults().length === 0 && (
            <EmptyState
              icon={SearchIcon}
              title="No Results Found"
              description="Try a different search term or source."
            />
          )}
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