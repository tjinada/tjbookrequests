// config/calibreAPI.js - Enhanced version with library-specific functions
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs');
const cache = require('../utils/calibreCache');

// Calibre configuration
const calibreServerUrl = process.env.CALIBRE_SERVER_URL || 'http://localhost:8080';
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

// Log function
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(path.join(__dirname, '../logs/calibre.log'), logMessage);
  console.log(message);
};

// Function to get current book IDs in library (for loaded_book_ids parameter)
async function getLoadedBookIds() {
  try {
    if (useCliOnly) {
      // Use CLI to get all book IDs
      const { stdout } = await execAsync(`calibredb list -f id --with-library="${calibreLibraryPath}"`);
      // Parse output to get IDs
      return stdout.trim().split('\n').filter(id => id && id !== 'id').map(id => id.trim());
    } else {
      // Use Calibre API to get book IDs
      const response = await calibreAPI.get('/ajax/search', {
        params: {
          query: '',
          library_id: 'calibre'
        }
      });
      
      if (response.data && response.data.book_ids) {
        return response.data.book_ids.map(id => String(id));
      }
      return [];
    }
  } catch (error) {
    log(`Error getting loaded book IDs: ${error.message}`);
    return [];
  }
}

// Function to get books for a specific user
async function getBooksForUser(username) {
  try {
    log(`Getting books for user: ${username}`);
    
    if (useCliOnly) {
      // Use Calibre CLI to search for books with user tag
      const { stdout } = await execAsync(`calibredb search "tags:${username}" --with-library="${calibreLibraryPath}" --for-machine`);
      const books = JSON.parse(stdout);
      return books;
    } else {
      // Use Calibre API to search for books with user tag
      // First get all books then filter by tag
      const allBooks = await module.exports.searchBooks('*');
      return allBooks.filter(book => 
        book.tags && book.tags.some(tag => tag.toLowerCase() === username.toLowerCase())
      );
    }
  } catch (error) {
    log(`Error getting books for user ${username}: ${error.message}`);
    throw error;
  }
}

// Helper function to check if a book is available in a specific format
async function isFormatAvailable(bookId, format) {
  try {
    if (useCliOnly) {
      // Check if format file exists in Calibre library
      const bookDetails = await module.exports.getBookDetails(bookId);
      
      if (!bookDetails || !bookDetails.path) {
        return false;
      }
      
      const formatPath = path.join(bookDetails.path, `${bookDetails.title}.${format.toLowerCase()}`);
      return fs.existsSync(formatPath);
    } else {
      // Use Calibre API to check formats
      const bookDetails = await module.exports.getBookDetails(bookId);
      
      return bookDetails && 
             bookDetails.formats && 
             bookDetails.formats.includes(format.toUpperCase());
    }
  } catch (error) {
    log(`Error checking format availability: ${error.message}`);
    return false;
  }
}

// Export the module with enhanced functions
module.exports = {
  /**
   * Get books by user tag
   * @param {string} username - Username to search for in tags
   * @returns {array} - Books with user tag
   */
  getBooksForUser,
  
  /**
   * Check if a format is available for a book
   * @param {string} bookId - Calibre book ID
   * @param {string} format - Format to check (EPUB, PDF, etc.)
   * @returns {boolean} - True if format is available
   */
  isFormatAvailable,
  
  /**
   * Get direct download URL for Calibre Content Server
   * @param {string} bookId - Calibre book ID
   * @param {string} format - Format to download
   * @returns {string} - Download URL
   */
  getDownloadUrl: (bookId, format) => {
    if (!calibreServerUrl) return null;
    return `${calibreServerUrl}/get/${format}/${bookId}/calibre`;
  },
  
  /**
   * Update book metadata in Calibre
   * @param {string} filePath - Path to the book file
   * @param {object} metadata - Metadata to update, including user info
   */
  updateBookMetadata: async (filePath, metadata) => {
    try {
      log(`Updating metadata for book at: ${filePath}`);
      
      // Extract book ID from path if possible
      let bookId;
      
      if (useCliOnly) {
        // Use Calibre CLI to find the book ID
        try {
          // Extract filename from path
          const filename = path.basename(filePath);
          const searchCmd = `calibredb search "file:${filename}" --with-library="${calibreLibraryPath}"`;
          const { stdout } = await execAsync(searchCmd);
          bookId = stdout.trim();
          
          if (!bookId || isNaN(parseInt(bookId))) {
            throw new Error(`Book not found or invalid ID for file: ${filename}`);
          }
        } catch (error) {
          throw new Error(`Error finding book with CLI: ${error.message}`);
        }
        
        // Use Calibre CLI to update metadata
        const userTag = metadata.user.replace(/[\s'"]/g, '_'); // Sanitize username for tag
        
        // Update tags to include username
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
        // Extract the numeric ID from the path
        const pathParts = filePath.split('/');
        const filenamePart = pathParts[pathParts.length - 2]; // Get the directory name which often has ID
        const idMatch = filenamePart.match(/\((\d+)\)/);
        
        if (idMatch && idMatch[1]) {
          bookId = idMatch[1];
        } else {
          // If we can't find ID in the path, search by filename
          const filename = path.basename(filePath);
          
          // Use the Calibre API search to find the book
          const searchResponse = await calibreAPI.get('/ajax/search', {
            params: {
              query: `"=${filename}"`,
              library_id: 'calibre'
            }
          });
          
          if (searchResponse.data && searchResponse.data.book_ids && searchResponse.data.book_ids.length > 0) {
            bookId = searchResponse.data.book_ids[0];
          } else {
            throw new Error(`Book not found for file: ${filename}`);
          }
        }
        
        log(`Found book in Calibre with ID: ${bookId}`);
        
        // Get current metadata
        const bookResponse = await calibreAPI.get(`/ajax/book/${bookId}/calibre`);
        const currentMetadata = bookResponse.data;
        
        // Update the metadata - get existing tags
        let updatedTags = [...(currentMetadata.tags || [])];
        
        // Add username as a tag if not already present
        if (metadata.user && !updatedTags.includes(metadata.user)) {
          updatedTags.push(metadata.user);
        }
        
        // Get loaded book IDs for payload
        const loadedBookIds = await getLoadedBookIds();
        
        // Create the proper payload format
        const payload = {
          changes: {
            tags: updatedTags
          },
          loaded_book_ids: loadedBookIds
        };
        
        // Post the update using the correct endpoint
        await calibreAPI.post(`/cdb/set-fields/${bookId}/calibre`, payload);
        
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
      
      // Extract book ID from path if possible
      let bookId;
      
      if (useCliOnly) {
        // Use CLI to get book ID
        const filename = path.basename(filePath);
        const searchCmd = `calibredb search "file:${filename}" --with-library="${calibreLibraryPath}"`;
        const { stdout } = await execAsync(searchCmd);
        bookId = stdout.trim();
        
        // Get the metadata
        const { stdout: metadataOutput } = await execAsync(`calibredb show_metadata ${bookId} --as-json --with-library="${calibreLibraryPath}"`);
        const metadata = JSON.parse(metadataOutput);
        
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
        // Extract the numeric ID from the path
        const pathParts = filePath.split('/');
        const filenamePart = pathParts[pathParts.length - 2]; // Get the directory name which often has ID
        const idMatch = filenamePart.match(/\((\d+)\)/);
        
        if (idMatch && idMatch[1]) {
          bookId = idMatch[1];
        } else {
          // If we can't find ID in the path, search by filename
          const filename = path.basename(filePath);
          
          // Use the Calibre API search to find the book
          const searchResponse = await calibreAPI.get('/ajax/search', {
            params: {
              query: `"=${filename}"`,
              library_id: 'calibre'
            }
          });
          
          if (searchResponse.data && searchResponse.data.book_ids && searchResponse.data.book_ids.length > 0) {
            bookId = searchResponse.data.book_ids[0];
          } else {
            throw new Error(`Book not found for file: ${filename}`);
          }
        }
        
        // Get book metadata
        const bookResponse = await calibreAPI.get(`/ajax/book/${bookId}/calibre`);
        const metadata = bookResponse.data;
        
        // Check if user tag exists
        const tags = metadata.tags || [];
        const hasUserTag = tags.includes(userInfo.username);
        
        // Check if user ID exists in custom field
        let hasUserId = false;
        if (metadata.user_metadata && metadata.user_metadata['#userid'] && metadata.user_metadata['#userid']['#value#']) {
          hasUserId = metadata.user_metadata['#userid']['#value#'] === userInfo.userId;
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
        const bookResponse = await calibreAPI.get(`/ajax/book/${bookId}/calibre`);
        const book = bookResponse.data;
        
        // Get available formats
        let formats = [];
        if (book.format_metadata) {
          formats = Object.keys(book.format_metadata);
        }
        
        return {
          id: bookId,
          title: book.title || 'Unknown Title',
          author: book.authors?.join(', ') || 'Unknown Author',
          tags: book.tags || [],
          formats: formats,
          path: book.format_metadata ? Object.values(book.format_metadata)[0]?.path || '' : '',
          uuid: book.uuid || '',
          added: book.timestamp || '',
          cover: book.cover ? `/api/library/cover/${bookId}` : null,
          thumbnail: book.thumbnail ? `/api/library/thumbnail/${bookId}` : null,
          comments: book.comments || '',
          customFields: book.user_metadata || {},
          formatMetadata: book.format_metadata || {}
        };
      }
    } catch (error) {
      log(`Error getting book details: ${error.message}`);
      throw error;
    }
  },

  /**
   * Search books in Calibre with pagination support
   * @param {string} query - Search query
   * @param {object} options - Pagination and sorting options
   * @returns {object} - Object containing books array and total count
   */
  searchBooks: async (query, options = {}) => {
    try {
      const { 
        offset = 0, 
        limit = 100, 
        sort = 'timestamp',
        sortOrder = 'desc',
        useCache = true
      } = options;
      
      // Check cache first
      if (useCache) {
        const cacheKey = cache.getCacheKey(query, options);
        const cachedData = cache.getCache(cacheKey);
        
        if (cachedData) {
          log(`Returning cached results for query: ${query}`);
          return cachedData;
        }
      }
      
      log(`Searching Calibre for: ${query}, offset: ${offset}, limit: ${limit}`);
      
      let result;
      
      if (useCliOnly) {
        // Use Calibre CLI
        // Handle special case for "all books" query
        const searchQuery = query === '*' ? '' : `"${query}"`;
        
        // Get total count first
        const { stdout: countOutput } = await execAsync(
          `calibredb list --for-machine --with-library="${calibreLibraryPath}" ${searchQuery} | jq '. | length'`
        );
        const totalCount = parseInt(countOutput.trim()) || 0;
        
        // Get paginated results
        const { stdout } = await execAsync(
          `calibredb list --for-machine --with-library="${calibreLibraryPath}" ${searchQuery}`
        );
        
        // Parse the JSON response
        const allBooks = JSON.parse(stdout);
        
        // Sort books based on options
        if (sort === 'title') {
          allBooks.sort((a, b) => {
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
          });
        } else if (sort === 'author') {
          allBooks.sort((a, b) => {
            const authorA = (a.author_sort || a.authors?.[0] || '').toLowerCase();
            const authorB = (b.author_sort || b.authors?.[0] || '').toLowerCase();
            return sortOrder === 'asc' ? authorA.localeCompare(authorB) : authorB.localeCompare(authorA);
          });
        } else if (sort === 'timestamp' || sort === 'added') {
          allBooks.sort((a, b) => {
            const dateA = new Date(a.timestamp || 0);
            const dateB = new Date(b.timestamp || 0);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          });
        }
        
        // Apply pagination
        const paginatedBooks = allBooks.slice(offset, offset + limit);
        
        // Enhance the books with additional properties
        const enhancedBooks = paginatedBooks.map(book => {
          // Process formats to ensure they're in a consistent format
          const formats = Array.isArray(book.formats) ? book.formats : [];
          
          return {
            ...book,
            formats: formats,
            author: book.author_sort || book.authors?.join(', ') || 'Unknown Author',
            cover: book.cover || null,
            path: book.path || null,
            downloadable: formats.length > 0,
            id: book.id.toString()
          };
        });
        
        result = {
          books: enhancedBooks,
          total: totalCount
        };
      } else {
        // Use Calibre Content Server API
        // The Calibre web API has a default limit, we need to handle pagination
        const sortParam = sort === 'added' ? 'timestamp' : sort;
        const sortString = sortOrder === 'desc' ? `-${sortParam}` : sortParam;
        
        const response = await calibreAPI.get('/ajax/search', {
          params: {
            query: query === '*' ? '' : query,
            sort: sortString,
            library_id: 'calibre',
            num: limit,
            offset: offset
          }
        });
        
        const totalItems = response.data.total_num || 0;
        
        if (!response.data.book_ids || response.data.book_ids.length === 0) {
          return {
            books: [],
            total: 0
          };
        }
        
        // Get details for each book
        const books = [];
        for (const id of response.data.book_ids) {
          try {
            const bookResponse = await calibreAPI.get(`/ajax/book/${id}/calibre`);
            const bookData = bookResponse.data;
            
            // Extract available formats
            let formats = [];
            if (bookData.format_metadata) {
              formats = Object.keys(bookData.format_metadata);
            }
            
            // Construct book object with enhanced properties
            books.push({
              id: id.toString(),
              title: bookData.title || 'Unknown Title',
              author: bookData.authors?.join(', ') || 'Unknown Author',
              tags: bookData.tags || [],
              formats: formats,
              added: bookData.timestamp || '',
              cover: bookData.cover ? `/api/library/cover/${id}` : null,
              thumbnail: bookData.thumbnail ? `/api/library/thumbnail/${id}` : null,
              uuid: bookData.uuid || '',
              publisher: bookData.publisher || '',
              rating: bookData.rating || 0,
              comments: bookData.comments || '',
              path: bookData.format_metadata ? Object.values(bookData.format_metadata)[0]?.path || '' : '',
              downloadable: formats.length > 0,
              formatMetadata: bookData.format_metadata || {}
            });
          } catch (err) {
            log(`Error fetching details for book ${id}: ${err.message}`);
          }
        }
        
        result = {
          books: books,
          total: totalItems
        };
      }
      
      // Save to cache if enabled
      if (useCache) {
        const cacheKey = cache.getCacheKey(query, options);
        cache.setCache(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      log(`Error searching Calibre: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Legacy search function for backward compatibility
   * @deprecated Use searchBooks with pagination options instead
   */
  searchBooksLegacy: async (query) => {
    const result = await module.exports.searchBooks(query, { limit: 100 });
    return result.books;
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
        // Get loaded book IDs for payload
        const loadedBookIds = await getLoadedBookIds();
        
        // Create the proper payload format matching your example
        const payload = {
          changes: {
            tags: tags
          },
          loaded_book_ids: loadedBookIds
        };
        
        // Post the update using the correct endpoint
        const response = await calibreAPI.post(`/cdb/set-fields/${bookId}/calibre`, payload);
        
        log(`Successfully updated tags for book ID: ${bookId} using API`);
        return { success: true, bookId, tags, response: response.data[bookId] };
      }
    } catch (error) {
      log(`Error updating tags: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Convert a book to a different format
   * @param {string} bookId - Calibre book ID
   * @param {string} fromFormat - Source format
   * @param {string} toFormat - Target format
   * @returns {object} - Result with success flag and path to converted file
   */
  convertBookFormat: async (bookId, fromFormat, toFormat) => {
    try {
      log(`Converting book ID ${bookId} from ${fromFormat} to ${toFormat}`);
      
      if (!useCliOnly) {
        return { 
          success: false, 
          message: 'Format conversion requires CLI access to Calibre' 
        };
      }
      
      // Get book details to find the file
      const bookDetails = await module.exports.getBookDetails(bookId);
      if (!bookDetails) {
        throw new Error(`Book not found with ID: ${bookId}`);
      }
      
      // Find the source format file
      const fromFormatLower = fromFormat.toLowerCase();
      let sourceFile = '';
      
      if (bookDetails.path) {
        // Try to construct source file path
        sourceFile = path.join(bookDetails.path, `${bookDetails.title}.${fromFormatLower}`);
        if (!fs.existsSync(sourceFile)) {
          // If file not found, try with book ID in filename
          sourceFile = path.join(bookDetails.path, `${bookId}.${fromFormatLower}`);
          if (!fs.existsSync(sourceFile)) {
            throw new Error(`Source file not found for format: ${fromFormat}`);
          }
        }
      } else {
        throw new Error('Book path not available');
      }
      
      // Create output file path
      const outputDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputFile = path.join(outputDir, `${bookDetails.title}.${toFormat.toLowerCase()}`);
      
      // Execute ebook-convert command
      const convertCmd = `ebook-convert "${sourceFile}" "${outputFile}"`;
      await execAsync(convertCmd);
      
      log(`Successfully converted ${fromFormat} to ${toFormat} for book ID: ${bookId}`);
      
      return {
        success: true,
        outputPath: outputFile,
        bookId: bookId
      };
    } catch (error) {
      log(`Error converting book format: ${error.message}`);
      throw error;
    }
  }
};

// Export a function to purge the cache
module.exports.purgeCache = function() {
  log('Purging Calibre cache...');
  // Reset any cache you might have
  return true;
};