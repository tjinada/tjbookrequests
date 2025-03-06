// backend/services/coverService.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

// Initialize cache for cover images 
const coverCache = {
  // Using ISBN as key: { url: string, timestamp: number }
  byIsbn: new Map(),
  // Using title+author as key: { url: string, timestamp: number }
  byTitleAuthor: new Map(),
  // 7-day cache expiry for covers
  CACHE_EXPIRY: 7 * 24 * 60 * 60 * 1000
};

/**
 * Book cover service that provides fallback cover images when primary source fails
 */
class CoverService {
  /**
   * Find a cover image for a book using various sources
   * @param {Object} book - Book object with title, author, and optionally ISBN
   * @returns {string|null} - URL to cover image or null if not found
   */
  async findCoverImage(book) {
    try {
      if (!book.title) {
        return null;
      }

      // If book already has a valid cover, return it
      if (book.cover && this.isValidCoverUrl(book.cover)) {
        return book.cover;
      }
      
      // Try to get from cache first
      let cacheKey = null;
      let cachedCover = null;
      
      // Try ISBN cache first (more reliable)
      if (book.isbn) {
        cacheKey = book.isbn;
        cachedCover = coverCache.byIsbn.get(cacheKey);
      }
      
      // Try title+author cache if ISBN cache miss
      if (!cachedCover && book.title && book.author) {
        cacheKey = `${book.title}|${book.author}`.toLowerCase();
        cachedCover = coverCache.byTitleAuthor.get(cacheKey);
      }
      
      // If we have a valid cache hit, return it
      if (cachedCover && 
          Date.now() - cachedCover.timestamp < coverCache.CACHE_EXPIRY) {
        return cachedCover.url;
      }
      
      // Search order: ISBN lookup, Google Books, OpenLibrary
      let coverUrl = null;
      
      // Try ISBN lookup first if available (most reliable)
      if (book.isbn) {
        coverUrl = await this.findCoverByISBN(book.isbn);
        
        if (coverUrl) {
          // Cache the result
          coverCache.byIsbn.set(book.isbn, {
            url: coverUrl,
            timestamp: Date.now()
          });
          return coverUrl;
        }
      }
      
      // Try Google Books search
      if (!coverUrl) {
        const searchTerms = `intitle:${encodeURIComponent(book.title)} inauthor:${encodeURIComponent(book.author || '')}`;
        coverUrl = await this.findCoverByGoogleSearch(searchTerms);
      }
      
      // Try OpenLibrary as last resort
      if (!coverUrl) {
        coverUrl = await this.findCoverByOpenLibrarySearch(book.title, book.author);
      }
      
      // If we found a cover, cache it
      if (coverUrl) {
        // Cache by ISBN if available
        if (book.isbn) {
          coverCache.byIsbn.set(book.isbn, {
            url: coverUrl,
            timestamp: Date.now()
          });
        }
        
        // Also cache by title+author
        if (book.title && book.author) {
          const titleAuthorKey = `${book.title}|${book.author}`.toLowerCase();
          coverCache.byTitleAuthor.set(titleAuthorKey, {
            url: coverUrl,
            timestamp: Date.now()
          });
        }
      }
      
      return coverUrl;
    } catch (error) {
      log(`Error finding cover image: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Find cover by ISBN using various services
   * @param {string} isbn - ISBN-10 or ISBN-13
   * @returns {string|null} - Cover URL or null
   */
  async findCoverByISBN(isbn) {
    try {
      // Clean up ISBN (remove hyphens, spaces)
      const cleanIsbn = isbn.replace(/[-\s]/g, '');
      
      // Try Open Library covers API
      try {
        // Try with ISBN-13 first (preferred)
        const openLibraryCoverUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
        const response = await axios.head(openLibraryCoverUrl);
        
        // Check if we got a valid image (not the 1x1 pixel placeholder)
        if (response.status === 200 && 
            response.headers['content-type'].startsWith('image/') &&
            response.headers['content-length'] > 1000) {
          return openLibraryCoverUrl;
        }
      } catch (error) {
        // Continue to next provider if this one fails
      }
      
      // Try Google Books API
      try {
        const googleResponse = await axios.get(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`
        );
        
        if (googleResponse.data.totalItems > 0) {
          const book = googleResponse.data.items[0];
          if (book.volumeInfo && book.volumeInfo.imageLinks) {
            // Get the largest available image
            const imageLinks = book.volumeInfo.imageLinks;
            
            // Select best available image
            const coverUrl = imageLinks.extraLarge || 
                             imageLinks.large || 
                             imageLinks.medium || 
                             imageLinks.small || 
                             imageLinks.thumbnail;
            
            if (coverUrl) {
              // Convert to HTTPS if needed
              return coverUrl.replace(/^http:/, 'https:');
            }
          }
        }
      } catch (error) {
        // Continue to next provider if this one fails
      }
      
      return null;
    } catch (error) {
      log(`Error finding cover by ISBN: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Find cover by Google Books search
   * @param {string} searchTerms - Search terms
   * @returns {string|null} - Cover URL or null
   */
  async findCoverByGoogleSearch(searchTerms) {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=${searchTerms}&maxResults=1`
      );
      
      if (response.data.totalItems > 0) {
        const book = response.data.items[0];
        if (book.volumeInfo && book.volumeInfo.imageLinks) {
          // Get the largest available image
          const imageLinks = book.volumeInfo.imageLinks;
          
          // Select best available image
          const coverUrl = imageLinks.extraLarge || 
                           imageLinks.large || 
                           imageLinks.medium || 
                           imageLinks.small || 
                           imageLinks.thumbnail;
          
          if (coverUrl) {
            // Convert to HTTPS if needed
            return coverUrl.replace(/^http:/, 'https:');
          }
        }
      }
      
      return null;
    } catch (error) {
      log(`Error finding cover by Google search: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Find cover by OpenLibrary search
   * @param {string} title - Book title
   * @param {string} author - Book author
   * @returns {string|null} - Cover URL or null
   */
  async findCoverByOpenLibrarySearch(title, author) {
    try {
      // Prepare search query
      let searchQuery = `title:${encodeURIComponent(title)}`;
      if (author) {
        searchQuery += `+author:${encodeURIComponent(author)}`;
      }
      
      const response = await axios.get(
        `https://openlibrary.org/search.json?q=${searchQuery}&limit=1`
      );
      
      if (response.data.docs && response.data.docs.length > 0) {
        const book = response.data.docs[0];
        
        // Check if book has a cover ID
        if (book.cover_i) {
          return `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
        }
        
        // Try ISBN if available
        if (book.isbn && book.isbn.length > 0) {
          return `https://covers.openlibrary.org/b/isbn/${book.isbn[0]}-L.jpg`;
        }
      }
      
      return null;
    } catch (error) {
      log(`Error finding cover by OpenLibrary search: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Check if a URL is likely to be a valid cover image
   * @param {string} url - URL to check
   * @returns {boolean} - True if valid cover URL
   */
  isValidCoverUrl(url) {
    if (!url) {
      return false;
    }
    
    // Reject placeholder images or no-image URLs
    const invalidPatterns = [
      'no-cover', 
      'no-image', 
      'nocover', 
      'noimage',
      'placeholder',
      'default_cover'
    ];
    
    // Check for invalid patterns
    return !invalidPatterns.some(pattern => url.toLowerCase().includes(pattern));
  }
  
  /**
   * Enhance a list of books with cover images
   * @param {Array} books - Array of book objects
   * @returns {Promise<Array>} - Books with enhanced cover images
   */
  async enhanceBookCovers(books) {
    if (!Array.isArray(books) || books.length === 0) {
      return books;
    }
    
    const enhancedBooks = [...books];
    const bookPromises = [];
    
    // Process books in parallel for efficiency
    for (let i = 0; i < enhancedBooks.length; i++) {
      const book = enhancedBooks[i];
      
      // Skip books that already have good covers
      if (book.cover && this.isValidCoverUrl(book.cover)) {
        continue;
      }
      
      // Create a promise for each book that needs a cover
      const bookPromise = this.findCoverImage(book)
        .then(coverUrl => {
          if (coverUrl) {
            enhancedBooks[i] = { ...book, cover: coverUrl };
          }
        })
        .catch(error => {
          // Log error but don't fail the entire operation
          log(`Error enhancing book cover: ${error.message}`);
        });
      
      bookPromises.push(bookPromise);
    }
    
    // Wait for all book cover enhancements to complete
    await Promise.all(bookPromises);
    
    return enhancedBooks;
  }
}

// Export singleton instance
module.exports = new CoverService();