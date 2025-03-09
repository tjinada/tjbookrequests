// config/calibreAPI.js
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs');

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

module.exports = {
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
        
        return {
          id: bookId,
          title: book.title || 'Unknown Title',
          author: book.authors?.join(', ') || 'Unknown Author',
          tags: book.tags || [],
          formats: book.formats || [],
          path: book.format_metadata ? Object.values(book.format_metadata)[0]?.path || '' : '',
          uuid: book.uuid || '',
          added: book.timestamp || '',
          cover: `${calibreServerUrl}${book.cover}` || null,
          thumbnail: book.thumbnail ? `${calibreServerUrl}${book.thumbnail}` : null,
          comments: book.comments || '',
          customFields: book.user_metadata || {}
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
            library_id: 'calibre'
          }
        });
        
        if (!response.data.book_ids || response.data.book_ids.length === 0) {
          return [];
        }
        
        // Get details for each book
        const books = [];
        for (const id of response.data.book_ids) {
          try {
            const bookResponse = await calibreAPI.get(`/ajax/book/${id}/calibre`);
            
            books.push({
              id,
              title: bookResponse.data.title || 'Unknown Title',
              author: bookResponse.data.authors?.join(', ') || 'Unknown Author',
              tags: bookResponse.data.tags || [],
              formats: bookResponse.data.formats || [],
              added: bookResponse.data.timestamp || '',
              cover: bookResponse.data.cover ? `${calibreServerUrl}${bookResponse.data.cover}` : null,
              thumbnail: bookResponse.data.thumbnail ? `${calibreServerUrl}${bookResponse.data.thumbnail}` : null,
              uuid: bookResponse.data.uuid || '',
              publisher: bookResponse.data.publisher || '',
              rating: bookResponse.data.rating || 0,
              comments: bookResponse.data.comments || ''
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
 * Get a download URL for a specific book format
 * @param {string} bookId - Calibre book ID
 * @param {string} format - Format type (e.g., 'EPUB', 'PDF', 'MOBI')
 * @returns {string|null} - Download URL or null if format not available
 */
  getBookDownloadUrl: async (bookId, format) => {
    try {
      log(`Generating download URL for book ${bookId}, format: ${format}`);
      
      // Normalize format to uppercase
      const formatUpper = format.toUpperCase();
      
      if (useCliOnly) {
        // When using CLI only, we need to construct a local URL or direct file path
        // First, get the book details to find the file path
        const bookDetails = await module.exports.getBookDetails(bookId);
        
        if (!bookDetails || !bookDetails.path) {
          throw new Error(`Book details or path not found for ID: ${bookId}`);
        }
        
        // Check for the requested format
        const formatFiles = bookDetails.formats || [];
        const formatFile = formatFiles.find(f => f.toUpperCase().endsWith(`.${formatUpper}`));
        
        if (!formatFile) {
          log(`Format ${format} not available for book ${bookId}`);
          return null;
        }
        
        // Return the full path to the file
        // In a real-world scenario, this path would need to be translated to a URL
        // that the frontend can access, or the backend would need to serve the file
        return formatFile;
      } else {
        // When using the Calibre content server
        // The URL format is typically /get/{book_id}/{format}
        const downloadUrl = `${calibreServerUrl}/get/${bookId}/${formatUpper.toLowerCase()}`;
        
        // Check if the format exists by making a HEAD request
        try {
          const response = await axios.head(downloadUrl, {
            auth: calibreUsername && calibrePassword ? {
              username: calibreUsername,
              password: calibrePassword
            } : undefined
          });
          
          if (response.status === 200) {
            return downloadUrl;
          }
        } catch (error) {
          log(`Format ${format} not available for book ${bookId}: ${error.message}`);
          return null;
        }
        
        return null;
      }
    } catch (error) {
      log(`Error generating download URL: ${error.message}`);
      throw error;
    }
  },

  /**
   * Send a book to a Kindle device via email
   * @param {string} bookId - Calibre book ID
   * @param {string} email - Kindle email address
   * @returns {object} - Result of the operation
   */
  sendToKindle: async (bookId, email) => {
    try {
      log(`Sending book ${bookId} to Kindle email: ${email}`);
      
      if (useCliOnly) {
        // Use Calibre CLI tool to send to Kindle
        const command = `calibre-smtp --attachment-from-library ${bookId} --attachment-format MOBI --relay your-smtp-server --port 587 --username your-email --password your-password your-email@example.com ${email} "Your requested book" "Here is your book from the library."`
        
        // This is a placeholder - you'll need to configure real SMTP settings
        // and implement proper error handling
        try {
          const { stdout } = await execAsync(command);
          log(`Successfully sent book ${bookId} to Kindle: ${stdout}`);
          return { success: true, message: "Book sent to Kindle successfully" };
        } catch (execError) {
          log(`Error sending to Kindle via CLI: ${execError.message}`);
          throw new Error(`Failed to send to Kindle: ${execError.message}`);
        }
      } else {
        // If you're using Calibre Content Server and it offers an API for this
        // Otherwise, you may need to implement email sending functionality in your app
        // This is a placeholder for the API call
        const response = await axios.post(`${calibreServerUrl}/cdb/send-to-device/${bookId}/calibre`, {
          email: email,
          format: 'MOBI', // Kindle typically uses MOBI format
          device_type: 'kindle'
        }, {
          auth: calibreUsername && calibrePassword ? {
            username: calibreUsername,
            password: calibrePassword
          } : undefined
        });
        
        if (response.data && response.data.success) {
          return { success: true, message: "Book sent to Kindle successfully" };
        } else {
          throw new Error('Failed to send book to Kindle');
        }
      }
    } catch (error) {
      log(`Error sending book to Kindle: ${error.message}`);
      throw error;
    }
  },

  /**
   * Send a book to a Kobo device
   * @param {string} bookId - Calibre book ID
   * @param {string} email - User's email for identification
   * @returns {object} - Result of the operation
   */
  sendToKobo: async (bookId, email) => {
    try {
      log(`Sending book ${bookId} to Kobo for user: ${email}`);
      
      // Note: Direct Kobo integration is complex and depends on your setup
      // This is a simplified approach using email as with Kindle
      
      if (useCliOnly) {
        // Use Calibre CLI to export in EPUB format (preferred for Kobo)
        // and then email it
        const command = `calibre-smtp --attachment-from-library ${bookId} --attachment-format EPUB --relay your-smtp-server --port 587 --username your-email --password your-password your-email@example.com ${email} "Your requested book" "Here is your book from the library in EPUB format for your Kobo device."`
        
        try {
          const { stdout } = await execAsync(command);
          log(`Successfully sent book ${bookId} to Kobo user: ${stdout}`);
          return { success: true, message: "Book sent to your email for Kobo" };
        } catch (execError) {
          log(`Error sending to Kobo via CLI: ${execError.message}`);
          throw new Error(`Failed to send to Kobo: ${execError.message}`);
        }
      } else {
        // If using Calibre Content Server
        // Similar approach as Kindle but with EPUB format
        const response = await axios.post(`${calibreServerUrl}/cdb/send-to-device/${bookId}/calibre`, {
          email: email,
          format: 'EPUB', // Kobo uses EPUB format
          device_type: 'kobo'
        }, {
          auth: calibreUsername && calibrePassword ? {
            username: calibreUsername,
            password: calibrePassword
          } : undefined
        });
        
        if (response.data && response.data.success) {
          return { success: true, message: "Book sent for your Kobo device" };
        } else {
          throw new Error('Failed to send book for Kobo');
        }
      }
    } catch (error) {
      log(`Error sending book to Kobo: ${error.message}`);
      throw error;
    }
  }
};