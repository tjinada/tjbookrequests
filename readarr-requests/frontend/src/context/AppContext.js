// src/context/AppContext.js
import React, { createContext, useState, useCallback, useEffect, useContext } from 'react';
import AuthContext from './AuthContext';
import api from '../utils/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { isAuthenticated, user } = useContext(AuthContext);
  
  // Books data
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [popularBooks, setPopularBooks] = useState([]);
  const [nytBooks, setNytBooks] = useState([]);
  const [awardBooks, setAwardBooks] = useState([]);
  const [recentBooks, setRecentBooks] = useState([]);
  const [personalizedBooks, setPersonalizedBooks] = useState([]);
  const [genreBooks, setGenreBooks] = useState({});

  // Additional state
  const [genres, setGenres] = useState([]);
  const [currentGenre, setCurrentGenre] = useState('');
  const [loading, setLoading] = useState({
    home: false,
    genres: false,
    personalized: false,
    genre: {}
  });
  const [error, setError] = useState({
    home: null,
    genres: null,
    personalized: null,
    genre: {}
  });

  // Filter state
  const [yearFilter, setYearFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);

  // Function to fetch trending and popular books
  const fetchHomeData = useCallback(async () => {
    setLoading(prev => ({ ...prev, home: true }));
    setError(prev => ({ ...prev, home: null }));

    try {
      const [trendingResponse, popularResponse, nytResponse, awardsResponse, recentResponse] = 
        await Promise.all([
          api.get('/books/latest'),
          api.get('/books/popular'),
          api.get('/books/nyt'),
          api.get('/books/awards'),
          api.get('/books/recent')
        ]);

      setTrendingBooks(trendingResponse.data);
      setPopularBooks(popularResponse.data);
      setNytBooks(nytResponse.data);
      setAwardBooks(awardsResponse.data);
      setRecentBooks(recentResponse.data);
    } catch (err) {
      console.error('Error fetching home data:', err);
      setError(prev => ({ ...prev, home: 'Failed to load book discovery data' }));
    } finally {
      setLoading(prev => ({ ...prev, home: false }));
    }
  }, []);

  // Function to fetch personalized recommendations
  const fetchPersonalizedRecommendations = useCallback(async () => {
    // Only fetch if user is authenticated
    if (!isAuthenticated) return;
    
    setLoading(prev => ({ ...prev, personalized: true }));
    setError(prev => ({ ...prev, personalized: null }));

    try {
      const response = await api.get('/books/personalized');
      setPersonalizedBooks(response.data);
    } catch (err) {
      console.error('Error fetching personalized recommendations:', err);
      setError(prev => ({ ...prev, personalized: 'Failed to load personalized recommendations' }));
    } finally {
      setLoading(prev => ({ ...prev, personalized: false }));
    }
  }, [isAuthenticated]);

  // Function to fetch available genres
  const fetchGenres = useCallback(async () => {
    setLoading(prev => ({ ...prev, genres: true }));
    setError(prev => ({ ...prev, genres: null }));

    try {
      const response = await api.get('/books/genres');
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

  // Function to fetch books for a specific genre
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
      const response = await api.get(`/books/genre/${genreId}`);

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
  }, [fetchHomeData, fetchGenres]);

  // Load personalized recommendations when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchPersonalizedRecommendations();
    }
  }, [isAuthenticated, fetchPersonalizedRecommendations]);

  // Provide the context value
  return (
    <AppContext.Provider
      value={{
        // Book data
        trendingBooks,
        popularBooks,
        nytBooks,
        awardBooks,
        recentBooks,
        personalizedBooks,
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
        fetchPersonalizedRecommendations,
        fetchGenres,
        fetchGenreBooks,
        selectGenre
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;