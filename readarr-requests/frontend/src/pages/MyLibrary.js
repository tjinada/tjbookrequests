// src/pages/MyLibrary.js
import React, { useState, useEffect, useContext } from 'react';
import { 
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link as MuiLink
} from '@mui/material';
import { Link } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import LibraryContext from '../context/LibraryContext';
import LibraryBookActions from '../components/library/LibraryBookActions';
import noImage from '../assets/no-image.png';

const MyLibrary = () => {
  const { myBooks, loading, error, fetchMyLibrary } = useContext(LibraryContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('added');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filteredBooks, setFilteredBooks] = useState([]);
  
  // Load library books on component mount
  useEffect(() => {
    fetchMyLibrary();
  }, [fetchMyLibrary]);
  
  // Filter and sort books when myBooks, searchQuery, or sort settings change
  useEffect(() => {
    if (!myBooks) return;
    
    // First filter books based on search query
    let filtered = [...myBooks];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book => 
        book.title?.toLowerCase().includes(query) || 
        book.author?.toLowerCase().includes(query)
      );
    }
    
    // Then sort the filtered books
    filtered.sort((a, b) => {
      if (sortBy === 'title') {
        const titleA = a.title?.toLowerCase() || '';
        const titleB = b.title?.toLowerCase() || '';
        return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
      } else if (sortBy === 'author') {
        const authorA = a.author?.toLowerCase() || '';
        const authorB = b.author?.toLowerCase() || '';
        return sortOrder === 'asc' ? authorA.localeCompare(authorB) : authorB.localeCompare(authorA);
      } else { // 'added' (default)
        const dateA = new Date(a.added || 0);
        const dateB = new Date(b.added || 0);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });
    
    setFilteredBooks(filtered);
  }, [myBooks, searchQuery, sortBy, sortOrder]);
  
  const handleClearSearch = () => {
    setSearchQuery('');
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Library
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Browse and read your available books
      </Typography>
      
      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={5}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by title or author"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="added">Date Added</MenuItem>
                <MenuItem value="title">Title</MenuItem>
                <MenuItem value="author">Author</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth>
              <InputLabel>Order</InputLabel>
              <Select
                value={sortOrder}
                label="Order"
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <MenuItem value="desc">Descending</MenuItem>
                <MenuItem value="asc">Ascending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} {searchQuery && 'found'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {filteredBooks.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 4 }}>
          {searchQuery ? (
            <>
              <Typography variant="h6" gutterBottom>
                No books match your search
              </Typography>
              <Typography variant="body1">
                Try a different search term or clear your search.
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                Your library is empty
              </Typography>
              <Typography variant="body1">
                Books you request will appear here once they're available.
              </Typography>
            </>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {filteredBooks.map(book => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}>
                <MuiLink 
                  component={Link} 
                  to={`/book/${book.id}`} 
                  underline="none" 
                  color="inherit"
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    flexGrow: 1 
                  }}
                >
                  <CardMedia
                    component="img"
                    image={book.cover || noImage}
                    alt={book.title}
                    sx={{ 
                      height: 200, 
                      objectFit: 'cover',
                      objectPosition: 'center top'
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="div" gutterBottom>
                      {book.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      by {book.author}
                    </Typography>
                    
                    {book.formats && book.formats.length > 0 && (
                      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {book.formats.map(format => (
                          <Chip 
                            key={format} 
                            label={format}
                            size="small"
                            color={format === 'EPUB' ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </MuiLink>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <LibraryBookActions book={book} />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MyLibrary;