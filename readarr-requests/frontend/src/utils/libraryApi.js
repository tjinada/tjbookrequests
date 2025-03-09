// src/utils/libraryApi.js
import api from './api';

/**
 * Utility functions to interact with the library API endpoints
 */
const libraryApi = {
  /**
   * Get the user's library books (tagged with their username in Calibre)
   * @returns {Promise<Array>} Array of book objects
   */
  getUserLibrary: async () => {
    try {
      const response = await api.get('/library');
      return response.data.books || [];
    } catch (error) {
      console.error('Error fetching user library:', error);
      throw error;
    }
  },
  
  /**
   * Get available formats for a specific book
   * @param {string} bookId - Calibre book ID
   * @returns {Promise<Array>} Array of available formats
   */
  getBookFormats: async (bookId) => {
    try {
      const response = await api.get(`/library/book/${bookId}/formats`);
      return response.data.availableFormats || [];
    } catch (error) {
      console.error('Error fetching book formats:', error);
      throw error;
    }
  },
  
  /**
   * Get a download URL for a book in a specific format
   * @param {string} bookId - Calibre book ID
   * @param {string} format - Format type (e.g., 'EPUB', 'PDF', 'MOBI')
   * @returns {Promise<string>} Download URL
   */
  getDownloadUrl: async (bookId, format) => {
    try {
      const response = await api.get(`/library/book/${bookId}/download/${format}`);
      return response.data.downloadUrl;
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  },
  
  /**
   * Send a book to an e-reader device
   * @param {string} bookId - Calibre book ID
   * @param {object} options - Options object
   * @param {string} options.email - Email address to send to
   * @param {string} options.deviceType - Device type ('kindle' or 'kobo')
   * @returns {Promise<object>} Result object
   */
  sendToEreader: async (bookId, { email, deviceType }) => {
    try {
      const response = await api.post(`/library/book/${bookId}/send-to-ereader`, {
        email,
        deviceType
      });
      return response.data;
    } catch (error) {
      console.error('Error sending to e-reader:', error);
      throw error;
    }
  },
  
  /**
   * Download a book in the specified format
   * @param {string} bookId - Calibre book ID
   * @param {string} format - Format type (e.g., 'EPUB', 'PDF', 'MOBI')
   * @param {string} title - Book title (for filename)
   */
  downloadBook: async (bookId, format, title) => {
    try {
      // Get the download URL
      const url = await libraryApi.getDownloadUrl(bookId, format);
      
      if (!url) {
        throw new Error('Download URL not available');
      }
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title}.${format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('Error downloading book:', error);
      throw error;
    }
  }
};

export default libraryApi;