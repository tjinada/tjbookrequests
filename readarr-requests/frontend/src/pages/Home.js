// Streamlined Home.js without filters and tabs
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import SearchIcon from '@mui/icons-material/Search';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AppContext from '../context/AppContext';
import AuthContext from '../context/AuthContext';
import CachePurger from '../components/admin/CachePurger';
import BookCarousel from '../components/books/BookCarousel';
import SwipeTutorial from '../components/common/SwipeTutorial';
import BookRequestDialog from '../components/books/BookRequestDialog';

const Home = () => {
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useContext(AuthContext);
  const isAdmin = user && user.role === 'admin';
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const navigate = useNavigate();

  // Get data and functions from context
  const { 
    popularBooks,
    nytBooks,
    awardBooks,
    recentBooks,
    personalizedBooks,
    fetchHomeData,
    fetchPersonalizedRecommendations,
    loading: contextLoading,
    error: contextError,
  } = useContext(AppContext);

  // Handle book request
  const handleRequestBook = (book) => {
    setSelectedBook(book);
    setRequestDialogOpen(true);
  };

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchHomeData();
      if (isAuthenticated) {
        await fetchPersonalizedRecommendations();
      }
      setLoading(false);
    };

    loadData();
  }, [fetchHomeData, fetchPersonalizedRecommendations, isAuthenticated]);

  // Helper function to sort books by rating
  const sortByRating = (books) => {
    if (!books || !Array.isArray(books)) return [];
    return [...books].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  };

  // Helper function to filter recent books
  const getRecentBooks = (books) => {
    if (!books || !Array.isArray(books)) return [];
    const currentYear = new Date().getFullYear();
    return books.filter(book => book.year && book.year >= currentYear - 5);
  };

  // If initial loading, show loading spinner
  if (loading && !popularBooks.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  // Filter fiction books
  const fictionBooks = popularBooks.filter(book => 
    book.genres && book.genres.some(g => 
      g.toLowerCase().includes('fiction') && 
      !g.toLowerCase().includes('non-fiction')
    )
  );

  // Filter non-fiction books
  const nonFictionBooks = popularBooks.filter(book => 
    book.genres && book.genres.some(g => 
      g.toLowerCase().includes('non-fiction')
    )
  );

  // Filter literary fiction
  const literaryBooks = [...popularBooks, ...awardBooks].filter(book => 
    book.genres && book.genres.some(g => 
      g.toLowerCase().includes('literary') || 
      g.toLowerCase().includes('classic')
    )
  );

  // Check if we have personalized recommendations
  const hasPersonalizedBooks = isAuthenticated && personalizedBooks && personalizedBooks.length > 0;

  return (
    <Box sx={{ px: { xs: 2, sm: 2, md: 3 }, pb: 4 }}> {/* Reduced side margins */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          mt: 1
        }}
      >
        <Typography variant="h5" component="h1">
          Discover Books
        </Typography>
        <Button 
          variant="contained" 
          component={Link} 
          to="/search" 
          startIcon={<SearchIcon />}
          size="small"
        >
          Search
        </Button>
      </Box>

      {/* Main content area - vertically scrolling carousels */}
      <Box>
        {/* Personalized recommendations */}
        {hasPersonalizedBooks && (
          <BookCarousel
            title="Recommended For You"
            books={personalizedBooks}
            onRequestBook={handleRequestBook}
            loading={contextLoading.personalized}
            error={contextError.personalized}
            emptyMessage="No personalized recommendations available."
          />
        )}
        
        {/* New Releases */}
        <BookCarousel
          title="New Releases"
          books={getRecentBooks(recentBooks)}
          onRequestBook={handleRequestBook}
          emptyMessage="No recent releases available."
        />
        
        {/* Popular Now */}
        <BookCarousel
          title="Popular Now"
          books={sortByRating(popularBooks).slice(0, 20)}
          onRequestBook={handleRequestBook}
          emptyMessage="No popular books available."
        />
        
        {/* NYT Bestsellers */}
        <BookCarousel
          title="Bestsellers"
          books={nytBooks}
          onRequestBook={handleRequestBook}
          emptyMessage="No bestsellers available."
        />
        
        {/* Fiction */}
        {fictionBooks.length > 0 && (
          <BookCarousel
            title="Fiction"
            books={sortByRating(fictionBooks)}
            onRequestBook={handleRequestBook}
            emptyMessage="No fiction books available."
          />
        )}
        
        {/* Non-Fiction */}
        {nonFictionBooks.length > 0 && (
          <BookCarousel
            title="Non-Fiction"
            books={sortByRating(nonFictionBooks)}
            onRequestBook={handleRequestBook}
            emptyMessage="No non-fiction books available."
          />
        )}
        
        {/* Award Winners */}
        <BookCarousel
          title="Award Winners"
          books={awardBooks}
          onRequestBook={handleRequestBook}
          emptyMessage="No award-winning books available."
        />
        
        {/* Literary Fiction */}
        {literaryBooks.length > 0 && (
          <BookCarousel
            title="Literary Fiction"
            books={sortByRating(literaryBooks)}
            onRequestBook={handleRequestBook}
            emptyMessage="No literary fiction books available."
          />
        )}
      </Box>
      
      {/* Admin-only refresh section */}
      {isAdmin && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <CachePurger onSuccess={fetchHomeData} />
        </Box>
      )}
      
      {/* Not authenticated - For You CTA */}
      {!isAuthenticated && (
        <Box sx={{ mt: 4, p: 3, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
          <Typography variant="h6" gutterBottom>
            Get Personalized Recommendations
          </Typography>
          <Typography variant="body1" paragraph>
            Sign in to see book recommendations tailored just for you based on your preferences.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/login')}
            startIcon={<FavoriteIcon />}
          >
            Sign In
          </Button>
        </Box>
      )}
      
      {/* Book request dialog */}
      {selectedBook && (
        <BookRequestDialog
          open={requestDialogOpen}
          onClose={() => setRequestDialogOpen(false)}
          book={selectedBook}
        />
      )}
      
      {/* Tutorial for swipe gestures */}
      <SwipeTutorial />
    </Box>
  );
};

export default Home;