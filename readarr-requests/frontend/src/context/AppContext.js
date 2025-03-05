// src/context/AppContext.js
import React, { createContext, useState, useCallback, useEffect } from 'react';
import api from '../utils/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Books data
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [popularBooks, setPopularBooks] = useState([]);
  const [nytBooks, setNytBooks] = useState([]);
  const [awardBooks, setAwardBooks] = useState([]);
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [genreBooks, setGenreBooks] = useState({});

  // Additional state
  const [genres, setGenres] = useState([]);
  const [currentGenre, setCurrentGenre] = useState('');
  const [loading, setLoading] = useState({
    home: false,
    genres: false,
    genre: {},
    recommended: false
  });
  const [error, setError] = useState({
    home: null,
    genres: null,
    genre: {},
    recommended: null
  });

  // Filter state
  const [yearFilter, setYearFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);

  // Function to fetch trending and popular books using Google API only
  const fetchHomeData = useCallback(async () => {
    setLoading(prev => ({ ...prev, home: true }));
    setError(prev => ({ ...prev, home: null }));

    try {
      // Use Google Books API for all sections
      const [trendingResponse, popularResponse, nytResponse, awardsResponse] = 
        await Promise.all([
          api.get('/google-books/trending', { params: { limit: 40 } }),
          api.get('/google-books/popular', { params: { limit: 40 } }),
          api.get('/google-books/nyt', { params: { limit: 40 } }),
          api.get('/google-books/awards', { params: { limit: 40 } })
        ]);

      setTrendingBooks(trendingResponse.data);
      setPopularBooks(popularResponse.data);
      setNytBooks(nytResponse.data);
      setAwardBooks(awardsResponse.data);
    } catch (err) {
      console.error('Error fetching home data:', err);
      setError(prev => ({ ...prev, home: 'Failed to load book discovery data' }));
    } finally {
      setLoading(prev => ({ ...prev, home: false }));
    }
  }, []);

  // Function to fetch available genres from Google Books
  const fetchGenres = useCallback(async () => {
    setLoading(prev => ({ ...prev, genres: true }));
    setError(prev => ({ ...prev, genres: null }));

    try {
      const response = await api.get('/google-books/genres');
      setGenres(response.data);

      // If we have genres but no current genre is selected, select the first one
      if (response.data.length > 0 && !currentGenre) {
        setCurrentGenre(response.data[0].id);
        fetchGenreBooks(response.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching genres:', err);
      setError(prev => ({ ...prev, genres: 'Failed to load genres' }));
    } finally {
      setLoading(prev => ({ ...prev, genres: false }));
    }
  }, [currentGenre]);

  // Function to fetch books for a specific genre from Google Books API
  const fetchGenreBooks = useCallback(async (genreId) => {
    // Skip if we already have this genre's books
    if (genreBooks[genreId]) return;

    setLoading(prev => ({ 
      ...prev, 
      genre: { ...prev.genre, [genreId]: true } 
    }));
    setError(prev => ({ 
      ...prev, 
      genre: { ...prev.genre, [genreId]: null } 
    }));

    try {
      console.log(`Fetching books for genre: ${genreId}`);
      const response = await api.get(`/google-books/genre/${genreId}`, {
        params: { limit: 40 }
      });

      setGenreBooks(prev => ({
        ...prev,
        [genreId]: response.data
      }));
    } catch (err) {
      console.error(`Error fetching books for genre ${genreId}:`, err);
      setError(prev => ({ 
        ...prev, 
        genre: { ...prev.genre, [genreId]: `Failed to load ${genreId} books` } 
      }));
    } finally {
      setLoading(prev => ({ 
        ...prev, 
        genre: { ...prev.genre, [genreId]: false } 
      }));
    }
  }, [genreBooks]);

  // New function to fetch recommended books based on user's request history
  const fetchRecommendedBooks = useCallback(async () => {
    setLoading(prev => ({ ...prev, recommended: true }));
    setError(prev => ({ ...prev, recommended: null }));

    try {
      // Get user's request history first
      const userRequestsResponse = await api.get('/requests/me');
      
      if (!userRequestsResponse.data || userRequestsResponse.data.length === 0) {
        // If user hasn't made any requests yet, use popular books as fallback
        setRecommendedBooks([]);
        setLoading(prev => ({ ...prev, recommended: false }));
        return;
      }

      // Extract genres, authors, and series from user's past requests
      const pastRequests = userRequestsResponse.data;
      const authors = new Set();
      const genres = new Set();
      const titles = new Set(); // For potential series detection

      // Collect unique authors and extract potential genres from titles/requests
      pastRequests.forEach(request => {
        if (request.author) authors.add(request.author.trim());
        if (request.title) titles.add(request.title.trim());
      });

      // Get more detailed info about past requested books where possible
      const enrichedRequests = await Promise.all(
        pastRequests.map(async (request) => {
          // Only try to enrich if we have source and bookId
          if (request.source === 'google' && request.bookId) {
            try {
              const bookId = request.bookId.startsWith('gb-') 
                ? request.bookId.substring(3) 
                : request.bookId;
                
              const details = await api.get(`/search/books/google/${bookId}`);
              return details.data;
            } catch (error) {
              return request;
            }
          }
          return request;
        })
      );
      
      // Extract genres from the enriched requests
      enrichedRequests.forEach(book => {
        if (book.genres && Array.isArray(book.genres)) {
          book.genres.forEach(genre => genres.add(genre));
        }
      });

      // Now get recommendations based on collected data
      const authorsList = Array.from(authors);
      const genresList = Array.from(genres);
      
      // Prioritize recommendations in this order:
      // 1. Same author as recent requests
      // 2. Same genres as user has requested before
      // 3. Fallback to popular books if nothing else works
      
      let recommendations = [];
      
      // Try to get books by the same authors first
      if (authorsList.length > 0) {
        // Take up to 3 recent authors
        const recentAuthors = authorsList.slice(0, 3);
        
        // Get books by each author
        const authorBooksPromises = recentAuthors.map(author => 
          api.get('/search/author', { params: { author, source: 'google' } })
        );
        
        const authorBooksResponses = await Promise.all(authorBooksPromises);
        
        // Collect and flatten all author books
        authorBooksResponses.forEach(response => {
          if (response.data && response.data.books) {
            recommendations = [...recommendations, ...response.data.books];
          }
        });
      }
      
      // If we don't have enough recommendations from authors, add genre-based ones
      if (recommendations.length < 15 && genresList.length > 0) {
        // Get books from genres user has shown interest in
        const genreTerms = genresList.join(' OR ');
        const genreBooksResponse = await api.get('/search/books', {
          params: { query: genreTerms, source: 'google' }
        });
        
        if (genreBooksResponse.data && genreBooksResponse.data.results) {
          const genreBooks = genreBooksResponse.data.results.google || [];
          recommendations = [...recommendations, ...genreBooks];
        }
      }
      
      // Deduplicate recommendations
      const uniqueRecommendations = [];
      const seenIds = new Set();
      
      recommendations.forEach(book => {
        if (book.id && !seenIds.has(book.id)) {
          seenIds.add(book.id);
          uniqueRecommendations.push(book);
        }
      });
      
      // Filter out books the user has already requested
      const requestedBookIds = new Set(pastRequests.map(req => req.bookId));
      const filteredRecommendations = uniqueRecommendations.filter(
        book => !requestedBookIds.has(book.id) && !requestedBookIds.has(`gb-${book.id}`)
      );
      
      setRecommendedBooks(filteredRecommendations);
      
      // If we still don't have enough recommendations, we'll fall back to popular books
      // This is handled in the UI by showing popular books when recommended are empty
      
    } catch (err) {
      console.error('Error fetching recommended books:', err);
      setError(prev => ({ ...prev, recommended: 'Failed to load recommended books' }));
    } finally {
      setLoading(prev => ({ ...prev, recommended: false }));
    }
  }, []);

  // Function to set current genre and fetch its books if needed
  const selectGenre = useCallback((genreId) => {
    console.log(`Selecting genre: ${genreId}`);
    setCurrentGenre(genreId);

    // Fetch this genre's books if we don't have them yet
    if (!genreBooks[genreId]) {
      fetchGenreBooks(genreId);
    }
  }, [genreBooks, fetchGenreBooks]);

  // Apply filters to books
  const filterBooks = useCallback((books) => {
    if (!books || !Array.isArray(books)) return [];

    return books.filter(book => {
      // Apply year filter
      if (yearFilter !== 'all') {
        const currentYear = new Date().getFullYear();

        if (yearFilter === 'recent' && (!book.year || book.year < currentYear - 5)) return false;
        if (yearFilter === 'decade' && (!book.year || book.year < currentYear - 10)) return false;
        if (yearFilter === 'century' && (!book.year || book.year < 2000)) return false;
        if (yearFilter === 'classic' && (!book.year || book.year > 1960)) return false;
      }

      // Apply rating filter
      if (ratingFilter > 0 && (!book.rating || book.rating < ratingFilter)) return false;

      return true;
    });
  }, [yearFilter, ratingFilter]);

  // Initial data load
  useEffect(() => {
    fetchHomeData();
    fetchGenres();
    fetchRecommendedBooks();
  }, [fetchHomeData, fetchGenres, fetchRecommendedBooks]);

  // Provide the context value
  return (
    <AppContext.Provider
      value={{
        // Book data
        trendingBooks,
        popularBooks,
        nytBooks,
        awardBooks,
        recommendedBooks,
        genres,
        genreBooks,
        currentGenre,

        // Loading and error states
        loading,
        error,

        // Filter state and functions
        yearFilter,
        setYearFilter,
        ratingFilter,
        setRatingFilter,
        filterBooks,

        // Actions
        fetchHomeData,
        fetchGenres,
        fetchGenreBooks,
        fetchRecommendedBooks,
        selectGenre
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;