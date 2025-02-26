// src/context/AppContext.js
import React, { createContext, useState, useCallback } from 'react';
import api from '../utils/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [homeDataLoaded, setHomeDataLoaded] = useState(false);
  const [homeDataError, setHomeDataError] = useState(null);

  // Function to fetch both trending and popular books
  const fetchHomeData = useCallback(async () => {
    if (homeDataLoaded) return; // Skip if already loaded

    try {
      // Fetch both in parallel
      const [trendingResponse] = await Promise.all([
        api.get('/books/latest'),
      ]);

      setTrendingBooks(trendingResponse.data);
      setHomeDataLoaded(true);
    } catch (err) {
      console.error('Error fetching home data:', err);
      setHomeDataError('Failed to load book discovery data');
    }
  }, [homeDataLoaded]);

  // Function to force refresh the data
  const refreshHomeData = useCallback(async () => {
    try {
      const [trendingResponse] = await Promise.all([
        api.get('/books/latest'),
      ]);

      setTrendingBooks(trendingResponse.data);
    } catch (err) {
      console.error('Error refreshing home data:', err);
      setHomeDataError('Failed to refresh book discovery data');
    }
  }, []);

  // Provide the context value
  return (
    <AppContext.Provider
      value={{
        trendingBooks,
        homeDataError,
        homeDataLoaded,
        fetchHomeData,
        refreshHomeData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;