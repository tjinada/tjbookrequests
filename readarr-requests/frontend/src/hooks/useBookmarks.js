// src/hooks/useBookmarks.js
import { useState, useEffect } from 'react';

/**
 * Custom hook for managing bookmarks for a specific book
 * @param {string} bookId - The ID of the book
 * @returns {Object} - Bookmark management functions and state
 */
const useBookmarks = (bookId) => {
  const [bookmarks, setBookmarks] = useState([]);

  // Load bookmarks from localStorage when the hook is first used
  useEffect(() => {
    if (!bookId) return;
    
    const loadBookmarks = () => {
      try {
        const savedBookmarks = localStorage.getItem(`bookmarks_${bookId}`);
        if (savedBookmarks) {
          setBookmarks(JSON.parse(savedBookmarks));
        }
      } catch (error) {
        console.error('Error loading bookmarks:', error);
        // If there's an error parsing the JSON, reset the bookmarks
        localStorage.removeItem(`bookmarks_${bookId}`);
        setBookmarks([]);
      }
    };
    
    loadBookmarks();
  }, [bookId]);

  // Add a bookmark
  const addBookmark = (cfi, title = 'Unnamed bookmark') => {
    if (!bookId || !cfi) return;
    
    // Check if this location is already bookmarked
    if (isBookmarked(cfi)) {
      return null;
    }
    
    // Create a new bookmark with timestamp
    const newBookmark = {
      cfi,
      title,
      timestamp: new Date().toISOString(),
    };
    
    // Add to state
    const updatedBookmarks = [...bookmarks, newBookmark];
    setBookmarks(updatedBookmarks);
    
    // Save to localStorage
    try {
      localStorage.setItem(`bookmarks_${bookId}`, JSON.stringify(updatedBookmarks));
    } catch (error) {
      console.error('Error saving bookmark:', error);
    }
    
    return newBookmark;
  };

  // Remove a bookmark
  const removeBookmark = (cfi) => {
    if (!bookId || !cfi) return;
    
    // Filter out the bookmark with the matching CFI
    const updatedBookmarks = bookmarks.filter(bookmark => bookmark.cfi !== cfi);
    setBookmarks(updatedBookmarks);
    
    // Save to localStorage
    try {
      localStorage.setItem(`bookmarks_${bookId}`, JSON.stringify(updatedBookmarks));
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  // Check if a location is bookmarked
  const isBookmarked = (cfi) => {
    if (!bookId || !cfi) return false;
    return bookmarks.some(bookmark => bookmark.cfi === cfi);
  };

  // Get a bookmark by CFI
  const getBookmark = (cfi) => {
    if (!bookId || !cfi) return null;
    return bookmarks.find(bookmark => bookmark.cfi === cfi) || null;
  };

  // Clear all bookmarks for the book
  const clearBookmarks = () => {
    if (!bookId) return;
    
    setBookmarks([]);
    localStorage.removeItem(`bookmarks_${bookId}`);
  };

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked,
    getBookmark,
    clearBookmarks
  };
};

export default useBookmarks;