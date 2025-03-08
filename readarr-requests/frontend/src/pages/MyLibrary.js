// src/pages/MyLibrary.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HistoryIcon from '@mui/icons-material/History';
import api from '../utils/api';
import LibraryBookCard from '../components/library/LibraryBookCard';
import EmptyLibraryState from '../components/library/EmptyLibraryState';

const MyLibrary = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Sort and filter states
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [sortOption, setSortOption] = useState('newest');
  const [filterOption, setFilterOption] = useState('all');

  // Fetch library books
  const fetchLibrary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters based on sort option
      let sortParam = 'addedAt';
      let orderParam = 'desc';
      
      switch (sortOption) {
        case 'newest':
          sortParam = 'addedAt';
          orderParam = 'desc';
          break;
        case 'oldest':
          sortParam = 'addedAt';
          orderParam = 'asc';
          break;
        case 'title':
          sortParam = 'title';
          orderParam = 'asc';
          break;
        case 'author':
          sortParam = 'author';
          orderParam = 'asc';
          break;
        case 'recent-read':
          sortParam = 'lastReadAt';
          orderParam = 'desc';
          break;
        default:
          break;
      }
      
      const response = await api.get('/library', {
        params: {
          sort: sortParam,
          order: orderParam
        }
      });
      
      setBooks(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching library:', err);
      setError('Failed to load your library. Please try again.');
      setLoading(false);
    }
  }, [sortOption]);

  // Initial load
  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle search
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Handle sort menu
  const handleSortClick = (event) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortSelect = (option) => {
    setSortOption(option);
    handleSortClose();
  };

  // Handle filter menu
  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterSelect = (option) => {
    setFilterOption(option);
    handleFilterClose();
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Navigate to book detail
  const handleBookClick = (bookId) => {
    navigate(`/library/${bookId}`);
  };

  // Filter books based on active tab, search term, and filter option
  const getFilteredBooks = () => {
    let filteredBooks = [...books];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredBooks = filteredBooks.filter(book => 
        book.title.toLowerCase().includes(term) || 
        book.author.toLowerCase().includes(term)
      );
    }
    
    // Filter by tab
    if (activeTab === 1) { // Favorites
      filteredBooks = filteredBooks.filter(book => book.isFavorite);
    } else if (activeTab === 2) { // Recently Read
      filteredBooks = filteredBooks.filter(book => book.lastReadAt);
      filteredBooks.sort((a, b) => new Date(b.lastReadAt) - new Date(a.lastReadAt));
    }
    
    // Apply additional filters
    if (filterOption === 'epub') {
      filteredBooks = filteredBooks.filter(book => book.fileFormat === 'epub');
    } else if (filterOption === 'pdf') {
      filteredBooks = filteredBooks.filter(book => book.fileFormat === 'pdf');
    } else if (filterOption === 'mobi') {
      filteredBooks = filteredBooks.filter(book => 
        book.fileFormat === 'mobi' || book.fileFormat === 'azw' || book.fileFormat === 'azw3'
      );
    }
    
    return filteredBooks;
  };

  const filteredBooks = getFilteredBooks();

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          My Library
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Access and manage your book collection
        </Typography>
      </Box>
      
      {/* Tabs for library sections */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab 
            icon={<LocalLibraryIcon />} 
            label="All Books" 
            iconPosition="start" 
          />
          <Tab 
            icon={<FavoriteIcon />} 
            label="Favorites" 
            iconPosition="start" 
          />
          <Tab 
            icon={<HistoryIcon />} 
            label="Recently Read" 
            iconPosition="start" 
          />
        </Tabs>
      </Paper>
      
      {/* Search and filter controls */}
      <Box sx={{ display: 'flex', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          placeholder="Search by title or author..."
          value={searchTerm}
          onChange={handleSearchChange}
          variant="outlined"
          size="small"
          sx={{ flexGrow: 1, minWidth: '200px' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  aria-label="clear search"
                  onClick={handleClearSearch}
                  edge="end"
                  size="small"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        <Button
          variant="outlined"
          startIcon={<SortIcon />}
          onClick={handleSortClick}
          size="small"
        >
          Sort
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          onClick={handleFilterClick}
          size="small"
        >
          Filter
        </Button>
        
        {/* Sort menu */}
        <Menu
          anchorEl={sortAnchorEl}
          open={Boolean(sortAnchorEl)}
          onClose={handleSortClose}
        >
          <MenuItem 
            onClick={() => handleSortSelect('newest')}
            selected={sortOption === 'newest'}
          >
            Newest First
          </MenuItem>
          <MenuItem 
            onClick={() => handleSortSelect('oldest')}
            selected={sortOption === 'oldest'}
          >
            Oldest First
          </MenuItem>
          <Divider />
          <MenuItem 
            onClick={() => handleSortSelect('title')}
            selected={sortOption === 'title'}
          >
            Title (A-Z)
          </MenuItem>
          <MenuItem 
            onClick={() => handleSortSelect('author')}
            selected={sortOption === 'author'}
          >
            Author (A-Z)
          </MenuItem>
          <Divider />
          <MenuItem 
            onClick={() => handleSortSelect('recent-read')}
            selected={sortOption === 'recent-read'}
          >
            Recently Read
          </MenuItem>
        </Menu>
        
        {/* Filter menu */}
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={handleFilterClose}
        >
          <MenuItem 
            onClick={() => handleFilterSelect('all')}
            selected={filterOption === 'all'}
          >
            All Formats
          </MenuItem>
          <MenuItem 
            onClick={() => handleFilterSelect('epub')}
            selected={filterOption === 'epub'}
          >
            EPUB Only
          </MenuItem>
          <MenuItem 
            onClick={() => handleFilterSelect('pdf')}
            selected={filterOption === 'pdf'}
          >
            PDF Only
          </MenuItem>
          <MenuItem 
            onClick={() => handleFilterSelect('mobi')}
            selected={filterOption === 'mobi'}
          >
            Kindle Formats (MOBI/AZW)
          </MenuItem>
        </Menu>
      </Box>
      
      {/* Loading state */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Error state */}
      {error && (
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={fetchLibrary}>
              Retry
            </Button>
          }
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}
      
      {/* Empty state */}
      {!loading && !error && books.length === 0 && (
        <EmptyLibraryState />
      )}
      
      {/* Empty search results */}
      {!loading && !error && books.length > 0 && filteredBooks.length === 0 && (
        <Box sx={{ textAlign: 'center', my: 5 }}>
          <Typography variant="h6" gutterBottom>
            No matching books found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filters
          </Typography>
          <Button 
            variant="outlined" 
            sx={{ mt: 2 }}
            onClick={handleClearSearch}
          >
            Clear Search
          </Button>
        </Box>
      )}
      
      {/* Book grid */}
      {!loading && !error && filteredBooks.length > 0 && (
        <Grid container spacing={3}>
          {filteredBooks.map((book) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={book._id}>
              <LibraryBookCard
                book={book}
                onClick={() => handleBookClick(book._id)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MyLibrary;