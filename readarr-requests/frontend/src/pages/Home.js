// src/pages/Home.js
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
    personalizedBooks,
    contextualRecommendations,
    fetchHomeData,
    fetchPersonalizedRecommendations,
    fetchContextualRecommendations,
    loading: contextLoading,
    error: contextError,
  } = useContext(AppContext);

  // Handle book click in discovery section - directly open the request dialog
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
      await fetchContextualRecommendations();
      setLoading(false);
    };

    loadData();
  }, [fetchHomeData, fetchPersonalizedRecommendations, fetchContextualRecommendations, isAuthenticated]);

  // Helper function to sort books by rating
  const sortByRating = (books) => {
    if (!books || !Array.isArray(books)) return [];
    return [...books].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  };

  // If initial loading, show loading spinner
  if (loading && !popularBooks.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  // Check if we have contextual recommendations
  const hasContextualActivity = contextualRecommendations.hasActivity;
  const hasPersonalizedBooks = isAuthenticated && contextualRecommendations.recommendedForYou && contextualRecommendations.recommendedForYou.length > 0;

  return (
    <Box sx={{ px: { xs: 2, sm: 2, md: 3 }, pb: 4 }}>
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
        {/* Contextual Recommendations for Users with Activity */}
        {hasContextualActivity ? (
          <>
            {/* Personalized recommendations */}
            {hasPersonalizedBooks && (
              <BookCarousel
                title="Recommended For You"
                books={contextualRecommendations.recommendedForYou}
                onRequestBook={handleRequestBook}
                loading={contextLoading.contextual}
                error={contextError.contextual}
                emptyMessage="No personalized recommendations available."
              />
            )}
            
            {/* Series Sections - Dynamic based on user requests */}
            {contextualRecommendations.seriesSections.map((section, index) => (
              <BookCarousel
                key={`series-${section.seriesName}-${index}`}
                title={`Books from ${section.seriesName} series`}
                books={section.books}
                onRequestBook={handleRequestBook}
                loading={contextLoading.contextual}
                error={contextError.contextual}
                emptyMessage={`No more books found from ${section.seriesName} series.`}
              />
            ))}
            
            {/* Author Sections - Dynamic based on user requests */}
            {contextualRecommendations.authorSections.map((section, index) => (
              <BookCarousel
                key={`author-${section.authorName}-${index}`}
                title={`Other books by ${section.authorName}`}
                books={section.books}
                onRequestBook={handleRequestBook}
                loading={contextLoading.contextual}
                error={contextError.contextual}
                emptyMessage={`No more books found by ${section.authorName}.`}
              />
            ))}
          </>
        ) : (
          /* Fallback sections for new users or users without activity */
          <>
            {/* Popular Now */}
            <BookCarousel
              title="Popular Now"
              books={contextualRecommendations.fallbackSections.popular.length > 0 ? 
                contextualRecommendations.fallbackSections.popular : 
                sortByRating(popularBooks).slice(0, 20)}
              onRequestBook={handleRequestBook}
              loading={contextLoading.contextual || contextLoading.home}
              emptyMessage="No popular books available."
            />
            
            {/* Bestsellers */}
            <BookCarousel
              title="Bestsellers"
              books={contextualRecommendations.fallbackSections.bestsellers.length > 0 ? 
                contextualRecommendations.fallbackSections.bestsellers : 
                nytBooks}
              onRequestBook={handleRequestBook}
              loading={contextLoading.contextual || contextLoading.home}
              emptyMessage="No bestsellers available."
            />
            
            {/* Award Winners for non-authenticated users */}
            {!isAuthenticated && (
              <BookCarousel
                title="Award Winners"
                books={awardBooks}
                onRequestBook={handleRequestBook}
                emptyMessage="No award-winning books available."
              />
            )}
          </>
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
          onClose={() => {
            setRequestDialogOpen(false);
            setSelectedBook(null);
          }}
          book={selectedBook}
        />
      )}
    </Box>
  );
};

export default Home;