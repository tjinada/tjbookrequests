// src/context/LibraryContext.js
import React, { createContext, useState, useCallback, useEffect, useContext } from 'react';
import AuthContext from './AuthContext';
import api from '../utils/api';

const LibraryContext = createContext();

export const LibraryProvider = ({ children }) => {
  const { isAuthenticated, user } = useContext(AuthContext);
  
  // Library data
  const [myBooks, setMyBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(null);
  const [bookFormats, setBookFormats] = useState({});
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Fetch user's library books
  const fetchMyLibrary = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/library');
      setMyBooks(response.data);
    } catch (err) {
      console.error('Error fetching library:', err);
      setError(err.response?.data?.message || 'Failed to load your library books.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);
  
  // Fetch available formats for a book
  const fetchBookFormats = useCallback(async (bookId) => {
    if (!bookId || !isAuthenticated) return;
    
    try {
      const response = await api.get(`/library/formats/${bookId}`);
      setBookFormats(prev => ({
        ...prev,
        [bookId]: response.data.formats
      }));
      return response.data.formats;
    } catch (err) {
      console.error(`Error fetching formats for book ${bookId}:`, err);
      return [];
    }
  }, [isAuthenticated]);
  
  // Get book details
  const getBookDetails = useCallback(async (bookId) => {
    if (!bookId || !isAuthenticated) return null;
    
    try {
      // First check if we have the book in our state
      const bookInState = myBooks.find(book => book.id === bookId);
      if (bookInState) return bookInState;
      
      // If not, fetch from server
      const response = await api.get(`/library/book/${bookId}`);
      return response.data;
    } catch (err) {
      console.error(`Error fetching book details for ${bookId}:`, err);
      return null;
    }
  }, [isAuthenticated, myBooks]);
  
  // Download a book
  const downloadBook = useCallback((bookId, format) => {
    if (!bookId || !format || !isAuthenticated) return;
    
    // Create download URL
    const downloadUrl = `/api/library/download/${bookId}/${format}`;
    
    // Open in new tab or trigger download
    window.open(downloadUrl, '_blank');
  }, [isAuthenticated]);
  
  // Send book to device (Kindle or Kobo)
  const sendToDevice = useCallback(async (bookId, deviceType, email) => {
    if (!bookId || !deviceType || !isAuthenticated) {
      return { success: false, message: 'Missing required parameters' };
    }
    
    try {
      const response = await api.post('/library/send-to-device', {
        bookId,
        deviceType,
        email
      });
      
      return { 
        success: true, 
        message: response.data.message || 'Book sent successfully' 
      };
    } catch (err) {
      console.error('Error sending book to device:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to send book to device' 
      };
    }
  }, [isAuthenticated]);
  
  // Refresh library
  const refreshLibrary = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);
  
  // Effect to load library when authenticated or refreshed
  useEffect(() => {
    if (isAuthenticated) {
      fetchMyLibrary();
    }
  }, [isAuthenticated, fetchMyLibrary, refreshTrigger]);
  
  // Provide the context value
  const contextValue = {
    myBooks,
    currentBook,
    setCurrentBook,
    loading,
    error,
    bookFormats,
    fetchMyLibrary,
    fetchBookFormats,
    getBookDetails,
    downloadBook,
    sendToDevice,
    refreshLibrary
  };
  
  return (
    <LibraryContext.Provider value={contextValue}>
      {children}
    </LibraryContext.Provider>
  );
};

export default LibraryContext;