// src/pages/Library.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Chip,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import SortIcon from '@mui/icons-material/Sort';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EmptyState from '../components/common/EmptyState';
import LibraryContext from '../context/LibraryContext';
import AuthContext from '../context/AuthContext';
import LibraryBookCard from '../components/library/LibraryBookCard';
import BookDetailDrawer from '../components/library/BookDetailDrawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const Library = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { myBooks, loading, error, refreshLibrary } = useContext(LibraryContext);
  const { isAuthenticated } = useContext(AuthContext);
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [sortOption, setSortOption] = useState('title'); 
  const [sortDirection, setSortDirection] = useState('asc');
  const [tabValue, setTabValue] = useState(0);
  
  // Define book collections based on categories
  const categories = [
    { id: 'all', label: 'All Books' },
    { id: 'recent', label: 'Recent' },
    { id: 'fiction', label: 'Fiction' },
    { id: 'nonfiction', label: 'Non-Fiction' }
  ];
  
  // Filter and sort books when the dependencies change
  useEffect(() => {
    if (!myBooks || !Array.isArray(myBooks)) {
      setFilteredBooks([]);
      return;
    }
    
    // First apply category filter
    let filtered = [...myBooks];
    if (tabValue > 0) {
      const category = categories[tabValue].id;
      if (category === 'recent') {
        // Filter for recently added books (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter(book => {
          const addedDate = book.added ? new Date(book.added) : null;
          return addedDate && addedDate >= thirtyDaysAgo;
        });
      } else if (category === 'fiction' || category === 'nonfiction') {
        // Filter based on tags or genres
        const isFiction = category === 'fiction';
        filtered = filtered.filter(book => {
          const tags = book.tags || [];
          // Check if book has fiction/non-fiction tag or belongs to typical fiction/non-fiction genres
          return tags.some(tag => 
            isFiction 
              ? ['fiction', 'novel', 'fantasy', 'sci-fi', 'romance'].includes(tag.toLowerCase())
              : ['non-fiction', 'nonfiction', 'biography', 'history', 'science'].includes(tag.toLowerCase())
          );
        });
      }
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(book => 
        book.title?.toLowerCase().includes(term) ||
        book.author?.toLowerCase().includes(term) ||
        (book.tags && book.tags.some(tag => tag.toLowerCase().includes(term)))
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
  }, [myBooks, searchTerm, sortOption, sortDirection, tabValue, categories]);
  
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
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1
      }}>
        <Typography variant="h4" component="h1">
          My Library
        </Typography>
        
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />} 
          onClick={handleRefresh}
          disabled={loading}
          size={isMobile ? "small" : "medium"}
        >
          Refresh
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {error}
        </Alert>
      )}
      
      {/* Search input */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by title, author, or tag..."
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
                <IconButton onClick={handleClearSearch} size="small" edge="end">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          size={isMobile ? "small" : "medium"}
        />
      </Paper>
      
      {/* Category tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : false}
          allowScrollButtonsMobile
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            minHeight: isMobile ? 40 : 48
          }}
          indicatorColor="primary"
          textColor="primary"
        >
          {categories.map((category, index) => (
            <Tab 
              key={category.id} 
              label={category.label} 
              sx={{ 
                minHeight: isMobile ? 40 : 48,
                fontSize: isMobile ? '0.8rem' : '0.875rem'
              }}
            />
          ))}
        </Tabs>
      </Paper>
      
      {/* Sort buttons - Only show if we have books */}
      {filteredBooks.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          mb: 2, 
          flexWrap: 'wrap',
          justifyContent: isMobile ? 'center' : 'flex-start'
        }}>
          <Button
            variant={sortOption === 'title' ? 'contained' : 'outlined'}
            onClick={() => handleSortOptionChange('title')}
            size="small"
            startIcon={<SortIcon />}
          >
            Title {sortOption === 'title' && (sortDirection === 'asc' ? '↓' : '↑')}
          </Button>
          
          <Button
            variant={sortOption === 'author' ? 'contained' : 'outlined'}
            onClick={() => handleSortOptionChange('author')}
            size="small"
            startIcon={sortOption === 'author' ? <SortIcon /> : null}
          >
            Author {sortOption === 'author' && (sortDirection === 'asc' ? '↓' : '↑')}
          </Button>
          
          <Button
            variant={sortOption === 'added' ? 'contained' : 'outlined'}
            onClick={() => handleSortOptionChange('added')}
            size="small"
            startIcon={sortOption === 'added' ? <SortIcon /> : null}
          >
            Recent {sortOption === 'added' && (sortDirection === 'asc' ? '↑' : '↓')}
          </Button>
        </Box>
      )}
      
      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredBooks.length > 0 ? (
        /* Book Grid */
        <Grid container spacing={2}>
          {filteredBooks.map((book) => (
            <Grid item xs={6} sm={6} md={4} lg={3} key={book.id}>
              <LibraryBookCard
                book={book}
                onClick={() => handleBookSelect(book)}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        /* Empty state */
        <EmptyState
          icon={MenuBookIcon}
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

export default Library;