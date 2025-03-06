// backend/services/coverService.js
const axios = require('axios');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/covers.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

/**
 * Service to handle book cover images
 */
class CoverService {
  constructor() {
    this.coverCacheDir = path.join(__dirname, '../cache/covers');
    this.setupCacheDirectory();
  }

  /**
   * Set up the cache directory for cover images
   */
  async setupCacheDirectory() {
    try {
      if (!(await existsAsync(this.coverCacheDir))) {
        await mkdirAsync(this.coverCacheDir, { recursive: true });
        log('Cover cache directory created');
      }
    } catch (error) {
      log(`Error setting up cover cache directory: ${error.message}`);
    }
  }

  /**
   * Enhance book covers for a list of books
   * @param {Array} books - Array of book objects
   * @returns {Array} - Enhanced books with improved cover URLs
   */
  async enhanceBookCovers(books) {
    if (!books || !Array.isArray(books)) return [];
    
    const enhanced = [];
    
    for (const book of books) {
      try {
        // Skip if book already has a good cover
        if (book.cover && !book.cover.includes('no_cover')) {
          enhanced.push(book);
          continue;
        }
        
        const enhancedBook = { ...book };
        
        // Try to get cover from OpenLibrary first (preferred source)
        if (book.isbn) {
          const olCover = await this.getOpenLibraryCover(book.isbn);
          if (olCover) {
            enhancedBook.cover = olCover;
            enhanced.push(enhancedBook);
            continue;
          }
        }
        
        // Try alternative identifiers with OpenLibrary
        if (book.olid) {
          const olIdCover = await this.getOpenLibraryCoverById(book.olid);
          if (olIdCover) {
            enhancedBook.cover = olIdCover;
            enhanced.push(enhancedBook);
            continue;
          }
        }
        
        // Try title and author search with OpenLibrary as last resort
        if (book.title && book.author) {
          const searchCover = await this.searchOpenLibraryCover(book.title, book.author);
          if (searchCover) {
            enhancedBook.cover = searchCover;
            enhanced.push(enhancedBook);
            continue;
          }
        }
        
        // If still no cover, keep the original book
        enhanced.push(book);
      } catch (error) {
        log(`Error enhancing cover for ${book.title}: ${error.message}`);
        enhanced.push(book);
      }
    }
    
    return enhanced;
  }

  /**
   * Get book cover from OpenLibrary by ISBN
   * @param {string} isbn - ISBN number
   * @returns {string|null} - Cover URL or null if not found
   */
  async getOpenLibraryCover(isbn) {
    try {
      if (!isbn) return null;
      
      // Clean ISBN - keep only digits and X
      const cleanIsbn = isbn.replace(/[^0-9X]/g, '');
      
      // Check for valid ISBN format
      if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) return null;
      
      // Use ISBN for OpenLibrary
      const coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
      
      // Check if cover exists by making a HEAD request
      const response = await axios.head(coverUrl);
      
      // If response is good and content length is more than 1KB (to avoid empty covers)
      if (response.status === 200 && 
          response.headers['content-length'] && 
          parseInt(response.headers['content-length']) > 1000) {
        return coverUrl;
      }
      
      return null;
    } catch (error) {
      // HTTP error likely means no cover found
      return null;
    }
  }

  /**
   * Get book cover from OpenLibrary by Open Library ID
   * @param {string} olid - Open Library ID
   * @returns {string|null} - Cover URL or null if not found
   */
  async getOpenLibraryCoverById(olid) {
    try {
      if (!olid) return null;
      
      // Clean OLID - remove any prefix
      const cleanOlid = olid.startsWith('OL') ? olid : `OL${olid}`;
      
      // Use OLID for OpenLibrary
      const coverUrl = `https://covers.openlibrary.org/b/olid/${cleanOlid}-L.jpg`;
      
      // Check if cover exists by making a HEAD request
      const response = await axios.head(coverUrl);
      
      // If response is good and content length is more than 1KB (to avoid empty covers)
      if (response.status === 200 && 
          response.headers['content-length'] && 
          parseInt(response.headers['content-length']) > 1000) {
        return coverUrl;
      }
      
      return null;
    } catch (error) {
      // HTTP error likely means no cover found
      return null;
    }
  }

  /**
   * Search OpenLibrary for a book cover by title and author
   * @param {string} title - Book title
   * @param {string} author - Book author
   * @returns {string|null} - Cover URL or null if not found
   */
  async searchOpenLibraryCover(title, author) {
    try {
      if (!title) return null;
      
      // Create search query
      const query = `${title} ${author || ''}`.trim();
      const encodedQuery = encodeURIComponent(query);
      
      // Make search request to OpenLibrary
      const searchUrl = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=1`;
      const response = await axios.get(searchUrl);
      
      if (response.data && 
          response.data.docs && 
          response.data.docs.length > 0 &&
          response.data.docs[0].cover_i) {
        
        // Get the cover ID
        const coverId = response.data.docs[0].cover_i;
        
        // Construct cover URL
        return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
      }
      
      return null;
    } catch (error) {
      log(`Error searching OpenLibrary cover: ${error.message}`);
      return null;
    }
  }

  /**
   * Fallback method to get Google Books cover
   * @param {string} googleId - Google Books ID
   * @returns {string|null} - Cover URL or null if not found
   */
  getGoogleBooksCover(googleId) {
    if (!googleId) return null;
    return `https://books.google.com/books/content?id=${googleId}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
  }
}

// Export a singleton instance
module.exports = new CoverService();