// src/pages/MyLibrary.js
import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import EmptyState from '../components/common/EmptyState';
import LibraryContext from '../context/LibraryContext';
import AuthContext from '../context/AuthContext';
import LibraryBookCard from '../components/library/LibraryBookCard';
import BookDetailDrawer from '../components/library/BookDetailDrawer';

const MyLibrary = () => {
  const navigate = useNavigate();
  const { myBooks, loading, error, refreshLibrary } = useContext(LibraryContext);
  const { isAuthenticated } = useContext(AuthContext);
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [sortOption, setSortOption] = useState('title'); // 'title', 'author', 'added'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc', 'desc'
  
  // Filter and sort books when the dependencies change
  useEffect(() => {
    if (!myBooks || !Array.isArray(myBooks)) {
      setFilteredBooks([]);
      return;
    }
    
    // Apply search filter
    let filtered = myBooks;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = myBooks.filter(book => 
        book.title?.toLowerCase().includes(term) ||
        book.author?.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      // Determine the values to compare based on sort option
      let valA, valB;
      switch (sortOption) {
        case 'author':
          valA = a.author?.toLowerCase() || '';
          valB = b.author?.toLowerCase() || '';
          break;
        case 'added':
          // Parse dates or use timestamps
          valA = a.added ? new Date(a.added).getTime() : 0;
          valB = b.added ? new Date(b.added).getTime() : 0;
          break;
        case 'title':
        default:
          valA = a.title?.toLowerCase() || '';
          valB = b.title?.toLowerCase() || '';
      }
      
      // Apply sort direction
      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
    
    setFilteredBooks(filtered);
  }, [myBooks, searchTerm, sortOption, sortDirection]);
  
  // Handle book selection
  const handleBookSelect = (book) => {
    setSelectedBook(book);
    setDrawerOpen(true);
  };
  
  // Toggle sort direction
  const handleSortClick = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  // Change sort option
  const handleSortOptionChange = (option) => {
    if (sortOption === option) {
      // Toggle direction if clicking the same option
      handleSortClick();
    } else {
      setSortOption(option);
      setSortDirection('asc'); // Reset to ascending when changing options
    }
  };
  
  // Handle search input
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
  };
  
  // Handle refresh
  const handleRefresh = () => {
    refreshLibrary();
  };
  
  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <EmptyState
        icon={LocalLibraryIcon}
        title="Sign In to Access Your Library"
        description="Please log in to view your books and manage your library."
        actionText="Sign In"
        onAction={() => navigate('/login')}
      />
    );
  }
  
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          My Library
        </Typography>
        
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />} 
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {error}
        </Alert>
      )}
      
      {/* Search and Sort Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by title, author..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={handleClearSearch} size="small">
                      {/* You can use a ClearIcon here */}
                      ✕
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Button
                variant={sortOption === 'title' ? 'contained' : 'outlined'}
                onClick={() => handleSortOptionChange('title')}
                size="small"
                startIcon={sortOption === 'title' && <SortIcon />}
              >
                Title {sortOption === 'title' && (sortDirection === 'asc' ? '↓' : '↑')}
              </Button>
              
              <Button
                variant={sortOption === 'author' ? 'contained' : 'outlined'}
                onClick={() => handleSortOptionChange('author')}
                size="small"
                startIcon={sortOption === 'author' && <SortIcon />}
              >
                Author {sortOption === 'author' && (sortDirection === 'asc' ? '↓' : '↑')}
              </Button>
              
              <Button
                variant={sortOption === 'added' ? 'contained' : 'outlined'}
                onClick={() => handleSortOptionChange('added')}
                size="small"
                startIcon={sortOption === 'added' && <SortIcon />}
              >
                Date Added {sortOption === 'added' && (sortDirection === 'asc' ? '↓' : '↑')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Book Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredBooks.length > 0 ? (
        <Grid container spacing={3}>
          {filteredBooks.map((book) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
              <LibraryBookCard
                book={book}
                onClick={() => handleBookSelect(book)}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState
          icon={LocalLibraryIcon}
          title={searchTerm ? "No books match your search" : "Your library is empty"}
          description={searchTerm 
            ? "Try a different search term or clear the search" 
            : "Books added to your Calibre library with your username tag will appear here"}
          actionText={searchTerm ? "Clear Search" : undefined}
          onAction={searchTerm ? handleClearSearch : undefined}
        />
      )}
      
      {/* Book Detail Drawer */}
      {selectedBook && (
        <BookDetailDrawer
          book={selectedBook}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </Box>
  );
};

export default MyLibrary;