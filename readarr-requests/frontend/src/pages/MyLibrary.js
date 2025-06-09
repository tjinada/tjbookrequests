// src/pages/MyLibrary.js
import React, { useState, useEffect, useContext } from 'react';
import { 
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  Alert,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import LibraryContext from '../context/LibraryContext';
import noImage from '../assets/no-image.png';
import LibraryBookDialog from '../components/library/LibraryBookDialog';
import EmailBookDialog from '../components/library/EmailBookDialog';

const MyLibrary = () => {
  const { myBooks, loading, error, fetchMyLibrary, isBookRead, isBookCurrentlyReading } = useContext(LibraryContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('added');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [currentlyReadingBooks, setCurrentlyReadingBooks] = useState([]);
  const [otherBooks, setOtherBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  
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
    
    // Separate currently reading books from others
    const currentlyReading = [];
    const others = [];
    
    filtered.forEach(book => {
      if (isBookCurrentlyReading(book)) {
        currentlyReading.push(book);
      } else {
        others.push(book);
      }
    });
    
    // Sort both arrays
    const sortFunction = (a, b) => {
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
    };
    
    currentlyReading.sort(sortFunction);
    others.sort(sortFunction);
    
    setCurrentlyReadingBooks(currentlyReading);
    setOtherBooks(others);
    
    // For backward compatibility, also set the combined filtered books
    setFilteredBooks([...currentlyReading, ...others]);
  }, [myBooks, searchQuery, sortBy, sortOrder, isBookCurrentlyReading]);
  
  const handleClearSearch = () => {
    setSearchQuery('');
  };
  
  // Handle book click to open book dialog
  const handleBookClick = (book) => {
    setSelectedBook(book);
    setBookDialogOpen(true);
  };
  
  // Handle email button click from book dialog
  const handleEmailClick = (book) => {
    setEmailDialogOpen(true);
  };
  
  // Render a book card with appropriate indicators for Continue Reading (horizontal scroll)
  const renderCurrentlyReadingCard = (book) => {
    const bookRead = isBookRead(book);
    const bookCurrentlyReading = isBookCurrentlyReading(book);
    
    return (
      <Card 
        key={book.id}
        sx={{ 
          minWidth: 160,
          maxWidth: 160,
          height: 260,
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6
          },
          cursor: 'pointer',
          position: 'relative',
          mr: 2,
          flexShrink: 0
        }}
        onClick={() => handleBookClick(book)}
      >
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            image={book.cover || noImage}
            alt={book.title}
            sx={{ 
              height: 180, 
              objectFit: 'cover',
              objectPosition: 'center top'
            }}
          />
          {/* Status indicators */}
          {bookCurrentlyReading && (
            <Box
              sx={{
                position: 'absolute',
                top: 6,
                left: 6,
                backgroundColor: 'warning.main',
                borderRadius: '50%',
                padding: 0.3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 2
              }}
            >
              <BookmarkIcon 
                sx={{ 
                  color: 'white', 
                  fontSize: '1rem' 
                }} 
              />
            </Box>
          )}
          {bookRead && (
            <Box
              sx={{
                position: 'absolute',
                top: 6,
                right: 6,
                backgroundColor: 'success.main',
                borderRadius: '50%',
                padding: 0.3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 2
              }}
            >
              <CheckCircleIcon 
                sx={{ 
                  color: 'white', 
                  fontSize: '1rem' 
                }} 
              />
            </Box>
          )}
        </Box>
        <CardContent sx={{ flexGrow: 1, p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography 
            variant="subtitle2" 
            component="div" 
            sx={{ 
              fontWeight: 'bold',
              fontSize: '0.875rem',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              mb: 0.5
            }}
          >
            {book.title}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{
              fontSize: '0.75rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical'
            }}
          >
            by {book.author}
          </Typography>
        </CardContent>
      </Card>
    );
  };
  
  // Render a book card with appropriate indicators for main library (2 columns)
  const renderLibraryCard = (book) => {
    const bookRead = isBookRead(book);
    const bookCurrentlyReading = isBookCurrentlyReading(book);
    
    return (
      <Grid item xs={6} key={book.id}>
        <Card 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 6
            },
            cursor: 'pointer',
            position: 'relative'
          }}
          onClick={() => handleBookClick(book)}
        >
          <Box sx={{ position: 'relative' }}>
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
            {/* Status indicators */}
            {bookCurrentlyReading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  backgroundColor: 'warning.main',
                  borderRadius: '50%',
                  padding: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 2
                }}
              >
                <BookmarkIcon 
                  sx={{ 
                    color: 'white', 
                    fontSize: '1.5rem' 
                  }} 
                />
              </Box>
            )}
            {bookRead && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'success.main',
                  borderRadius: '50%',
                  padding: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 2
                }}
              >
                <CheckCircleIcon 
                  sx={{ 
                    color: 'white', 
                    fontSize: '1.5rem' 
                  }} 
                />
              </Box>
            )}
          </Box>
          <CardContent sx={{ flexGrow: 1, p: 2 }}>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{
                fontSize: '1rem',
                fontWeight: 'bold',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                mb: 0.5
              }}
            >
              {book.title}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical'
              }}
            >
              by {book.author}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    );
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
        <>
          {/* Continue Reading Section - Horizontal Scroll */}
          {currentlyReadingBooks.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
                Continue Reading
              </Typography>
              <Box 
                sx={{ 
                  display: 'flex',
                  overflowX: 'auto',
                  pb: 2,
                  '&::-webkit-scrollbar': {
                    height: 6,
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    borderRadius: 3
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: 3,
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.5)'
                    }
                  }
                }}
              >
                {currentlyReadingBooks.map(book => renderCurrentlyReadingCard(book))}
              </Box>
            </Box>
          )}
          
          {/* Main Library Section - 2 Column Grid */}
          {otherBooks.length > 0 && (
            <Box>
              <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
                Your Library
              </Typography>
              <Grid container spacing={2}>
                {otherBooks.map(book => renderLibraryCard(book))}
              </Grid>
            </Box>
          )}
        </>
      )}
      
      {/* Book Details Dialog */}
      {selectedBook && (
        <LibraryBookDialog
          open={bookDialogOpen}
          onClose={() => setBookDialogOpen(false)}
          book={selectedBook}
          onEmailClick={handleEmailClick}
        />
      )}
      
      {/* Email Dialog */}
      {selectedBook && (
        <EmailBookDialog
          open={emailDialogOpen}
          onClose={() => setEmailDialogOpen(false)}
          book={selectedBook}
        />
      )}
    </Box>
  );
};

export default MyLibrary;