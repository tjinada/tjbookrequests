// config/calibreAPI.js
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs');

// Calibre configuration
const calibreServerUrl = process.env.CALIBRE_SERVER_URL;
const calibreUsername = process.env.CALIBRE_USERNAME;
const calibrePassword = process.env.CALIBRE_PASSWORD;
const calibreLibraryPath = process.env.CALIBRE_LIBRARY_PATH;
const useCliOnly = process.env.CALIBRE_USE_CLI_ONLY === 'true';

// Create axios instance for Calibre Content Server
const calibreAPI = axios.create({
  baseURL: calibreServerUrl,
  timeout: 10000,
});

// Set auth if provided
if (calibreUsername && calibrePassword) {
  calibreAPI.defaults.auth = {
    username: calibreUsername,
    password: calibrePassword
  };
}

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Helper to get book ID from file path
async function getBookIdFromPath(filePath) {
  const filename = path.basename(filePath);
  
  if (useCliOnly) {
    // Use calibredb CLI
    try {
      const searchCmd = `calibredb search "file:${filename}" --with-library="${calibreLibraryPath}"`;
      const { stdout } = await execAsync(searchCmd);
      const bookId = stdout.trim();
      
      if (!bookId || isNaN(parseInt(bookId))) {
        throw new Error(`Book not found or invalid ID: ${filename}`);
      }
      
      return bookId;
    } catch (error) {
      throw new Error(`Error finding book with CLI: ${error.message}`);
    }
  } else {
    // Use Calibre Content Server API
    try {
      // First, try to find by exact file match
      const searchResponse = await calibreAPI.get('/ajax/search', {
        params: {
          query: `"=${filename}"`,
          sort: 'timestamp',
          library_id: 'default'
        }
      });
      
      if (searchResponse.data.book_ids && searchResponse.data.book_ids.length > 0) {
        return searchResponse.data.book_ids[0];
      }
      
      // If exact match fails, try a more permissive search
      const fallbackResponse = await calibreAPI.get('/ajax/search', {
        params: {
          query: filename.replace(/\.[^/.]+$/, ""), // Remove file extension
          sort: 'timestamp',
          library_id: 'default'
        }
      });
      
      if (!fallbackResponse.data.book_ids || fallbackResponse.data.book_ids.length === 0) {
        throw new Error(`Book not found in Calibre: ${filename}`);
      }
      
      // If multiple results, take the most recent one (assuming it's the one we want)
      return fallbackResponse.data.book_ids[0];
    } catch (error) {
      throw new Error(`Error finding book with API: ${error.message}`);
    }
  }
}

// Log function
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(path.join(__dirname, '../logs/calibre.log'), logMessage);
  console.log(message);
};

module.exports = {
  /**
   * Update book metadata in Calibre
   * @param {string} filePath - Path to the book file
   * @param {object} metadata - Metadata to update, including user info
   */
  updateBookMetadata: async (filePath, metadata) => {
    try {
      log(`Updating metadata for book at: ${filePath}`);
      
      // Get the book ID
      const bookId = await getBookIdFromPath(filePath);
      log(`Found book in Calibre with ID: ${bookId}`);
      
      if (useCliOnly) {
        // Use Calibre CLI to update metadata
        // Update tags to include username
        const userTag = metadata.user.replace(/[\s'"]/g, '_'); // Sanitize username for tag
        const tagCmd = `calibredb set_metadata ${bookId} --field tags:"+${userTag}" --with-library="${calibreLibraryPath}"`;
        await execAsync(tagCmd);
        log(`Added user tag: ${userTag}`);
        
        // If you have a custom column for user ID (e.g., #userid)
        // Make sure this custom column exists in your Calibre library
        const userIdCmd = `calibredb set_metadata ${bookId} --field "#userid:${metadata.userId}" --with-library="${calibreLibraryPath}"`;
        await execAsync(userIdCmd);
        log(`Added user ID: ${metadata.userId}`);
        
        log(`Successfully updated metadata for book ID: ${bookId} using CLI`);
        return { success: true, bookId };
      } else {
        // Use Calibre Content Server API
        // Get current metadata
        const bookResponse = await calibreAPI.get('/ajax/book', {
          params: {
            id: bookId,
            library_id: 'default'
          }
        });
        
        const currentMetadata = bookResponse.data;
        
        // Update the metadata
        // Add user as a custom field or tag
        let updatedTags = currentMetadata.tags || [];
        
        // Add username as a tag if not already present
        if (metadata.user && !updatedTags.includes(metadata.user)) {
          updatedTags.push(metadata.user);
        }
        
        // Prepare the updated metadata object
        const updatedMetadata = {
          tags: updatedTags
        };
        
        // Add custom metadata if it exists
        if (currentMetadata.custom_metadata) {
          updatedMetadata.custom_metadata = {
            ...currentMetadata.custom_metadata
          };
          
          // Add userid as a custom field (assumes the custom field exists in Calibre)
          // The correct format depends on your Calibre custom column configuration
          if (metadata.userId) {
            // For text columns
            updatedMetadata.custom_metadata['#userid'] = metadata.userId;
          }
        }
        
        // Send update request
        await calibreAPI.post('/ajax/set_book_metadata', {
          id: bookId,
          library_id: 'default',
          metadata: updatedMetadata
        });
        
        log(`Successfully updated metadata for book ID: ${bookId} using API`);
        return { success: true, bookId };
      }
    } catch (error) {
      log(`Error updating Calibre metadata: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Check if a book has the required user metadata
   * @param {string} filePath - Path to the book file
   * @param {object} userInfo - User information to check
   * @returns {object} - Result with hasUserMetadata flag
   */
  checkBookMetadata: async (filePath, userInfo) => {
    try {
      log(`Checking metadata for book at: ${filePath}`);
      
      // Get the book ID
      const bookId = await getBookIdFromPath(filePath);
      
      if (useCliOnly) {
        // Use Calibre CLI to check metadata
        // Get the metadata
        const { stdout } = await execAsync(`calibredb show_metadata ${bookId} --as-json --with-library="${calibreLibraryPath}"`);
        const metadata = JSON.parse(stdout);
        
        // Check if user tag exists
        const tags = metadata.tags || [];
        const hasUserTag = tags.includes(userInfo.username);
        
        // Check if user ID exists in custom field
        let hasUserId = false;
        if (metadata.user_metadata && metadata.user_metadata['#userid']) {
          hasUserId = metadata.user_metadata['#userid'].value === userInfo.userId;
        }
        
        return {
          hasUserMetadata: hasUserTag && hasUserId,
          hasUserTag,
          hasUserId,
          bookId
        };
      } else {
        // Use Calibre Content Server API
        const bookResponse = await calibreAPI.get('/ajax/book', {
          params: {
            id: bookId,
            library_id: 'default'
          }
        });
        
        const metadata = bookResponse.data;
        
        // Check if user tag exists
        const tags = metadata.tags || [];
        const hasUserTag = tags.includes(userInfo.username);
        
        // Check if user ID exists in custom field
        let hasUserId = false;
        if (metadata.custom_metadata && metadata.custom_metadata['#userid']) {
          hasUserId = metadata.custom_metadata['#userid'] === userInfo.userId;
        }
        
        return {
          hasUserMetadata: hasUserTag && hasUserId,
          hasUserTag,
          hasUserId,
          bookId
        };
      }
    } catch (error) {
      log(`Error checking Calibre metadata: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Get book details from Calibre
   * @param {string} bookId - Calibre book ID
   * @returns {object} - Book details
   */
  getBookDetails: async (bookId) => {
    try {
      log(`Getting details for book ID: ${bookId}`);
      
      if (useCliOnly) {
        // Use Calibre CLI
        const { stdout } = await execAsync(`calibredb show_metadata ${bookId} --as-json --with-library="${calibreLibraryPath}"`);
        const book = JSON.parse(stdout);
        
        return {
          id: bookId,
          title: book.title || 'Unknown Title',
          author: book.author_sort || book.authors?.join(', ') || 'Unknown Author',
          tags: Array.isArray(book.tags) ? book.tags : (book.tags ? book.tags.split(',').map(t => t.trim()) : []),
          formats: book.formats || [],
          path: book.path || '',
          uuid: book.uuid || '',
          added: book.timestamp || '',
          cover: book.cover || null,
          comments: book.comments || '',
          customFields: book.user_metadata || {}
        };
      } else {
        // Use Calibre Content Server API
        const bookResponse = await calibreAPI.get('/ajax/book', {
          params: {
            id: bookId,
            library_id: 'default'
          }
        });
        
        const book = bookResponse.data;
        
        return {
          id: bookId,
          title: book.title || 'Unknown Title',
          author: book.authors?.join(', ') || 'Unknown Author',
          tags: book.tags || [],
          formats: book.formats || [],
          path: book.path || book.book_path || '',
          uuid: book.uuid || '',
          added: book.timestamp || '',
          cover: book.cover_url || null,
          comments: book.comments || '',
          customFields: book.custom_metadata || {}
        };
      }
    } catch (error) {
      log(`Error getting book details: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Search for books in Calibre
   * @param {string} query - Search query
   * @returns {array} - List of books
   */
  searchBooks: async (query) => {
    try {
      log(`Searching Calibre for: ${query}`);
      
      if (useCliOnly) {
        // Use Calibre CLI
        // Handle special case for "all books" query
        const searchQuery = query === '*' ? '' : `"${query}"`; 
        const { stdout } = await execAsync(`calibredb list --for-machine --with-library="${calibreLibraryPath}" ${searchQuery}`);
        
        // Parse the JSON response
        const books = JSON.parse(stdout);
        return books;
      } else {
        // Use Calibre Content Server API
        const response = await calibreAPI.get('/ajax/search', {
          params: {
            query: query === '*' ? '' : query,
            sort: 'timestamp',
            library_id: 'default'
          }
        });
        
        if (!response.data.book_ids || response.data.book_ids.length === 0) {
          return [];
        }
        
        // Get details for each book
        const books = [];
        for (const id of response.data.book_ids) {
          try {
            const bookResponse = await calibreAPI.get('/ajax/book', {
              params: {
                id,
                library_id: 'default'
              }
            });
            
            books.push({
              ...bookResponse.data,
              id
            });
          } catch (err) {
            log(`Error fetching details for book ${id}: ${err.message}`);
          }
        }
        
        return books;
      }
    } catch (error) {
      log(`Error searching Calibre: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Update book tags in Calibre
   * @param {string} bookId - Calibre book ID
   * @param {array} tags - Array of tags to set
   */
  updateBookTags: async (bookId, tags) => {
    try {
      log(`Updating tags for book ID: ${bookId}`);
      log(`New tags: ${tags.join(', ')}`);
      
      if (useCliOnly) {
        // Use Calibre CLI to update tags
        // Note: This replaces all existing tags
        const sanitizedTags = tags.map(tag => tag.replace(/[,'"]/g, '_').trim());
        const tagsString = sanitizedTags.map(t => `"${t}"`).join(',');
        
        const tagCmd = `calibredb set_metadata ${bookId} --field tags:"${tagsString}" --with-library="${calibreLibraryPath}"`;
        await execAsync(tagCmd);
        
        log(`Successfully updated tags for book ID: ${bookId} using CLI`);
        return { success: true, bookId, tags };
      } else {
        // Use Calibre Content Server API
        // First get current metadata
        const bookResponse = await calibreAPI.get('/ajax/book', {
          params: {
            id: bookId,
            library_id: 'default'
          }
        });
        
        const currentMetadata = bookResponse.data;
        
        // Update metadata with new tags
        const updatedMetadata = {
          ...currentMetadata,
          tags: tags
        };
        
        // Send update request
        await calibreAPI.post('/ajax/set_book_metadata', {
          id: bookId,
          library_id: 'default',
          metadata: updatedMetadata
        });
        
        log(`Successfully updated tags for book ID: ${bookId} using API`);
        return { success: true, bookId, tags };
      }
    } catch (error) {
      log(`Error updating tags: ${error.message}`);
      throw error;
    }
  }
};