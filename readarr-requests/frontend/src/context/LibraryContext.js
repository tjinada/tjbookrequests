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
  
  // Delete book from library
  const deleteBookFromLibrary = useCallback(async (bookId) => {
    if (!bookId || !isAuthenticated) {
      return { success: false, message: 'Missing required parameters' };
    }
    
    try {
      const response = await api.delete(`/library/book/${bookId}`);
      
      // Remove the book from local state
      setMyBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
      
      return { 
        success: true, 
        message: response.data.message || 'Book removed from library successfully' 
      };
    } catch (err) {
      console.error('Error deleting book from library:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to remove book from library' 
      };
    }
  }, [isAuthenticated]);
  
  // Mark book as read/unread
  const toggleBookReadStatus = useCallback(async (bookId, isRead) => {
    if (!bookId || !isAuthenticated) {
      return { success: false, message: 'Missing required parameters' };
    }
    
    try {
      const response = await api.post(`/library/book/${bookId}/read`, {
        isRead
      });
      
      // Update the book in local state
      setMyBooks(prevBooks => 
        prevBooks.map(book => {
          if (book.id === bookId) {
            const userDoc = user; // Get current user
            const readTag = `${userDoc.username}_read`;
            
            let updatedTags = [...(book.tags || [])];
            
            if (isRead) {
              // Add read tag if not present
              if (!updatedTags.some(tag => tag.toLowerCase() === readTag.toLowerCase())) {
                updatedTags.push(readTag);
              }
            } else {
              // Remove read tag
              updatedTags = updatedTags.filter(tag => 
                tag.toLowerCase() !== readTag.toLowerCase()
              );
            }
            
            return {
              ...book,
              tags: updatedTags
            };
          }
          return book;
        })
      );
      
      return { 
        success: true, 
        isRead: response.data.isRead,
        message: response.data.message || 'Book status updated successfully' 
      };
    } catch (err) {
      console.error('Error updating book read status:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to update book status' 
      };
    }
  }, [isAuthenticated, user]);
  
  // Check if a book is marked as read by current user
  const isBookRead = useCallback((book) => {
    if (!book || !book.tags || !user) return false;
    
    const readTag = `${user.username}_read`;
    return book.tags.some(tag => tag.toLowerCase() === readTag.toLowerCase());
  }, [user]);
  
  // Check if a book is currently being read by current user
  const isBookCurrentlyReading = useCallback((book) => {
    if (!book || !book.tags || !user) return false;
    
    const readingTag = `${user.username}_reading`;
    return book.tags.some(tag => tag.toLowerCase() === readingTag.toLowerCase());
  }, [user]);
  
  // Mark book as currently reading
  const markAsCurrentlyReading = useCallback(async (bookId) => {
    if (!bookId || !isAuthenticated) {
      return { success: false, message: 'Missing required parameters' };
    }
    
    try {
      const response = await api.post(`/library/book/${bookId}/reading`);
      
      // Update the book in local state
      setMyBooks(prevBooks => 
        prevBooks.map(book => {
          if (book.id === bookId) {
            const userDoc = user; // Get current user
            const readingTag = `${userDoc.username}_reading`;
            
            let updatedTags = [...(book.tags || [])];
            
            // Add reading tag if not present
            if (!updatedTags.some(tag => tag.toLowerCase() === readingTag.toLowerCase())) {
              updatedTags.push(readingTag);
            }
            
            return {
              ...book,
              tags: updatedTags
            };
          }
          return book;
        })
      );
      
      return { 
        success: true, 
        message: response.data.message || 'Book marked as currently reading' 
      };
    } catch (err) {
      console.error('Error marking book as currently reading:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to mark book as currently reading' 
      };
    }
  }, [isAuthenticated, user]);
  
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
    deleteBookFromLibrary,
    toggleBookReadStatus,
    isBookRead,
    isBookCurrentlyReading,
    markAsCurrentlyReading,
    refreshLibrary
  };
  
  return (
    <LibraryContext.Provider value={contextValue}>
      {children}
    </LibraryContext.Provider>
  );
};

export default LibraryContext;