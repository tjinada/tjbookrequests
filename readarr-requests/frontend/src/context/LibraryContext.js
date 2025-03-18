// src/context/LibraryContext.js
import React, { createContext, useState, useCallback, useEffect, useContext } from 'react';
import AuthContext from './AuthContext';
import api from '../utils/api';

const LibraryContext = createContext();

export const LibraryProvider = ({ children }) => {
  const { isAuthenticated, user } = useContext(AuthContext);
  
  // Library data
  const [myBooks, setMyBooks] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [recentlyRead, setRecentlyRead] = useState([]);
  const [bookFormats, setBookFormats] = useState({});
  const [readingProgress, setReadingProgress] = useState({});
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Fetch user's library books
  const fetchMyLibrary = useCallback(async () => {
    if (!isAuthenticated) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/library/books');
      const books = response.data;
      
      setMyBooks(books);
      
      // Set recently added books (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recent = books.filter(book => {
        const addedDate = new Date(book.added);
        return addedDate >= thirtyDaysAgo;
      });
      
      setRecentlyAdded(recent);
      
      // Set recently read books
      if (books.some(book => book.lastRead)) {
        const recentlyReadBooks = [...books]
          .filter(book => book.lastRead)
          .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
          .slice(0, 3);
        
        setRecentlyRead(recentlyReadBooks);
      }
      
      return books;
    } catch (err) {
      console.error('Error fetching library:', err);
      setError('Failed to load your library. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);
  
  // Fetch available formats for a book
  const fetchBookFormats = useCallback(async (bookId) => {
    if (!bookId || !isAuthenticated) return [];
    
    try {
      const response = await api.get(`/library/formats/${bookId}`);
      const formats = response.data.formats || [];
      
      // Update formats cache
      setBookFormats(prev => ({
        ...prev,
        [bookId]: formats
      }));
      
      return formats;
    } catch (err) {
      console.error(`Error fetching formats for book ${bookId}:`, err);
      return [];
    }
  }, [isAuthenticated]);
  
  // Get book details
  const getBookDetails = useCallback(async (bookId) => {
    if (!bookId) return null;
    
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
  }, [myBooks]);
  
  // Save reading progress
  const saveReadingProgress = useCallback(async (bookId, progress) => {
    if (!bookId || !isAuthenticated) return false;
    
    try {
      // Save to server
      await api.post(`/library/progress/${bookId}`, { progress });
      
      // Update local state
      setReadingProgress(prev => ({
        ...prev,
        [bookId]: progress
      }));
      
      // Save to localStorage as backup
      localStorage.setItem(`reading_progress_${bookId}`, JSON.stringify(progress));
      
      return true;
    } catch (err) {
      console.error(`Error saving reading progress for book ${bookId}:`, err);
      return false;
    }
  }, [isAuthenticated]);
  
  // Download a book
  const downloadBook = useCallback((bookId, format) => {
    if (!bookId || !format || !isAuthenticated) return;
    
    // Create the download URL
    const downloadUrl = `/api/library/download/${bookId}/${format}`;
    
    // Open in new tab to trigger download
    window.open(downloadUrl, '_blank');
  }, [isAuthenticated]);
  
  // Send to device
  const sendToDevice = useCallback(async (bookId, deviceType, email, format) => {
    if (!bookId || !deviceType || !email || !isAuthenticated) {
      return { success: false, message: 'Missing required parameters' };
    }
    
    try {
      const response = await api.post('/library/send-to-device', {
        bookId,
        deviceType,
        email,
        format
      });
      
      return { 
        success: true, 
        message: response.data.message || 'Book successfully sent to your device!'
      };
    } catch (err) {
      console.error('Error sending book to device:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to send book to device. Please try again.' 
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
  
  // Effect to load reading progress from localStorage
  useEffect(() => {
    if (isAuthenticated && myBooks.length > 0) {
      const loadedProgress = {};
      
      myBooks.forEach(book => {
        const savedProgress = localStorage.getItem(`reading_progress_${book.id}`);
        if (savedProgress) {
          loadedProgress[book.id] = JSON.parse(savedProgress);
        }
      });
      
      setReadingProgress(loadedProgress);
    }
  }, [isAuthenticated, myBooks]);
  
  // Provide the context value
  const contextValue = {
    myBooks,
    recentlyAdded,
    recentlyRead,
    bookFormats,
    readingProgress,
    loading,
    error,
    fetchMyLibrary,
    fetchBookFormats,
    getBookDetails,
    saveReadingProgress,
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