// src/context/AppContext.js
import React, { createContext, useState, useCallback, useEffect } from 'react';
import api from '../utils/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [popularBooks, setPopularBooks] = useState([]);
  const [genreBooks, setGenreBooks] = useState({});
  const [genres, setGenres] = useState([]);
  const [currentGenre, setCurrentGenre] = useState('');
  const [homeDataLoaded, setHomeDataLoaded] = useState(false);
  const [genresLoaded, setGenresLoaded] = useState(false);
  const [homeDataError, setHomeDataError] = useState(null);

  // Function to fetch both trending and popular books
  const fetchHomeData = useCallback(async () => {
    if (homeDataLoaded) return; // Skip if already loaded

    try {
      // Fetch both in parallel
      const [trendingResponse, popularResponse] = await Promise.all([
        api.get('/books/latest'),
      ]);

      setTrendingBooks(trendingResponse.data);
      setHomeDataLoaded(true);
    } catch (err) {
      console.error('Error fetching home data:', err);
      setHomeDataError('Failed to load book discovery data');
    }
  }, [homeDataLoaded]);

  // Function to fetch available genres
  const fetchGenres = useCallback(async () => {
    if (genresLoaded) return; // Skip if already loaded

    try {
      const response = await api.get('/books/genres');
      setGenres(response.data);
      setGenresLoaded(true);

      // Set the first genre as current if none selected
      if (!currentGenre && response.data.length > 0) {
        setCurrentGenre(response.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching genres:', err);
    }
  }, [genresLoaded, currentGenre]);

  const fetchGenreBooks = useCallback(async (genreId) => {
    try {
      console.log(`Making API call to fetch books for genre: ${genreId}`); // Add logging
      const response = await api.get(`/books/genre/${genreId}`);
      console.log(`API response received for genre ${genreId}: ${response.data.length} books`); // Add logging
  
      setGenreBooks(prev => ({
        ...prev,
        [genreId]: response.data
      }));
    } catch (err) {
      console.error(`Error fetching genre ${genreId} books:`, err);
    }
  }, []);

  // Function to set current genre and fetch its books if needed
  const selectGenre = useCallback((genreId) => {
    console.log(`selectGenre called with: ${genreId}`); // Add logging
    setCurrentGenre(genreId);
  
    // Check if we already have this genre's books
    if (!genreBooks[genreId]) {
      console.log(`Fetching books for genre: ${genreId}`); // Add logging
      fetchGenreBooks(genreId);
    } else {
      console.log(`Using cached books for genre: ${genreId}`); // Add logging
    }
  }, [genreBooks, fetchGenreBooks]);

  // Fetch genres when component mounts
  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  // Function to force refresh all data
  const refreshAllData = useCallback(async () => {
    try {
      // Fetch trending and popular
      const [trendingResponse, popularResponse] = await Promise.all([
        api.get('/books/latest'),
      ]);

      setTrendingBooks(trendingResponse.data);
      setPopularBooks(popularResponse.data);

      // Refresh current genre if selected
      if (currentGenre) {
        const genreResponse = await api.get(`/books/genre/${currentGenre}`);
        setGenreBooks(prev => ({
          ...prev,
          [currentGenre]: genreResponse.data
        }));
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      setHomeDataError('Failed to refresh data');
    }
  }, [currentGenre]);

  // Provide the context value
  return (
    <AppContext.Provider
      value={{
        trendingBooks,
        popularBooks,
        genres,
        genreBooks,
        currentGenre,
        homeDataError,
        homeDataLoaded,
        fetchHomeData,
        fetchGenres,
        fetchGenreBooks,
        selectGenre,
        refreshAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;