// src/pages/MyLibrary.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  useMediaQuery
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import SortIcon from '@mui/icons-material/Sort';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useTheme } from '@mui/material/styles';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';
import LibraryBookCard from '../components/library/LibraryBookCard';
import EmptyState from '../components/common/EmptyState';
import BookDetailsDialog from '../components/library/BookDetailsDialog';

const MyLibrary = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  // State for library books
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentView, setCurrentView] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('title'); // 'title', 'author', 'added'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  
  // Tab state for possibly categorizing books
  const [tabValue, setTabValue] = useState(0);
  
  // Fetch library books
  const fetchLibrary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/library');
      setBooks(response.data.books);
      setFilteredBooks(response.data.books);
    } catch (err) {
      console.error('Error fetching library:', err);
      setError('Failed to load your library books. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch on component mount
  useEffect(() => {
    fetchLibrary();
  }, []);
  
  // Filter books when search query changes
  useEffect(() => {
    if (!books.length) return;
    
    if (!searchQuery.trim()) {
      setFilteredBooks(books);
      return;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = books.filter(book => 
      book.title.toLowerCase().includes(lowerQuery) || 
      book.author.toLowerCase().includes(lowerQuery) ||
      (book.tags && book.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
    
    setFilteredBooks(filtered);
  }, [searchQuery, books]);
  
  // Apply sorting to the books
  useEffect(() => {
    if (!filteredBooks.length) return;
    
    const sorted = [...filteredBooks].sort((a, b) => {
      let compareA, compareB;
      
      // Extract the properties to compare based on sortBy
      if (sortBy === 'title') {
        compareA = a.title.toLowerCase();
        compareB = b.title.toLowerCase();
      } else if (sortBy === 'author') {
        compareA = a.author.toLowerCase();
        compareB = b.author.toLowerCase();
      } else if (sortBy === 'added') {
        // Parse dates - fallback to 0 if invalid
        compareA = new Date(a.added || 0).getTime();
        compareB = new Date(b.added || 0).getTime();
      } else {
        compareA = a.title.toLowerCase();
        compareB = b.title.toLowerCase();
      }
      
      // Apply sort order
      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });
    
    setFilteredBooks(sorted);
  }, [sortBy, sortOrder]);
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery('');
  };
  
  // Toggle sort order when clicking the same sort field
  const handleSortChange = (field) => {
    if (sortBy === field) {
      // Toggle order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Change field and reset to ascending
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle book selection for details dialog
  const handleBookSelect = (book) => {
    setSelectedBook(book);
    setDetailsDialogOpen(true);
  };
  
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <AutoStoriesIcon sx={{ mr: 1 }} /> My Library
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchLibrary}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Search and filters */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by title, author or tags..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="All Books" />
            <Tab label="Recently Added" />
            <Tab label="Fiction" />
            <Tab label="Non-Fiction" />
          </Tabs>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<SortIcon />}
              onClick={() => handleSortChange('title')}
              color={sortBy === 'title' ? 'primary' : 'inherit'}
              endIcon={sortBy === 'title' ? (sortOrder === 'asc' ? '↑' : '↓') : null}
            >
              Title
            </Button>
            
            <Button
              size="small"
              startIcon={<SortIcon />}
              onClick={() => handleSortChange('author')}
              color={sortBy === 'author' ? 'primary' : 'inherit'}
              endIcon={sortBy === 'author' ? (sortOrder === 'asc' ? '↑' : '↓') : null}
            >
              Author
            </Button>
            
            <Button
              size="small"
              startIcon={<SortIcon />}
              onClick={() => handleSortChange('added')}
              color={sortBy === 'added' ? 'primary' : 'inherit'}
              endIcon={sortBy === 'added' ? (sortOrder === 'asc' ? '↑' : '↓') : null}
            >
              Date Added
            </Button>
          </Box>
        </Box>
        
        <Divider sx={{ mt: 1 }} />
      </Box>
      
      {/* Loading indicator */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : books.length === 0 ? (
        <EmptyState
          icon={MenuBookIcon}
          title="Your Library is Empty"
          description="Books from Calibre that are tagged with your username will appear here."
          actionText="Browse Books"
          onAction={() => navigate('/search')}
        />
      ) : filteredBooks.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No Matching Books"
          description="No books match your search criteria. Try a different search term."
          actionText="Clear Search"
          onAction={handleClearSearch}
        />
      ) : (
        <Grid container spacing={2}>
          {filteredBooks.map((book) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
              <LibraryBookCard book={book} onClick={() => handleBookSelect(book)} />
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Book details dialog */}
      {selectedBook && (
        <BookDetailsDialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          book={selectedBook}
        />
      )}
    </Box>
  );
};

export default MyLibrary;