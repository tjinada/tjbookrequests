// config/readarr.js - Simplified version with lastname, firstname search
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const readarrAPI = axios.create({
  baseURL: process.env.READARR_API_URL,
  headers: {
    'X-Api-Key': process.env.READARR_API_KEY
  }
});

// Add logging to help troubleshoot
const logFile = path.join(__dirname, '../logs/readarr.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

// Clean and normalize text for better comparisons
function normalizeText(text) {
  if (!text) return '';
  
  return text.toLowerCase()
    .replace(/\./g, '') // Remove periods
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Helper function to clean and prepare book/author input
function preprocessBookData(bookData) {
  const result = { ...bookData };
  
  // Fix cases where title contains "by Author"
  if (result.title && result.title.includes(' by ') && !result.title.startsWith('by ')) {
    // This format is likely "Book Title by Author Name"
    const parts = result.title.split(' by ');
    if (parts.length >= 2) {
      // Check if the part after "by" matches the author field
      const potentialAuthor = parts[parts.length - 1].trim();
      const titlePart = parts.slice(0, -1).join(' by ').trim();
      
      // If the author field matches what's after "by", use the title part alone
      if (potentialAuthor.toLowerCase() === result.author.toLowerCase()) {
        log(`Title contains redundant author info. Updating title from "${result.title}" to "${titlePart}"`);
        result.title = titlePart;
      }
    }
  }
  
  return result;
}

// Helper function to convert author name to "lastname, firstname" format
function getLastnameFirstFormat(authorName) {
  if (!authorName) return '';
  
  const parts = authorName.trim().split(' ');
  if (parts.length < 2) return authorName; // Can't split if it's just one word
  
  const lastName = parts.pop(); // Get the last part as the last name
  const firstName = parts.join(' '); // Join the rest as the first name(s)
  
  return `${lastName}, ${firstName}`;
}

module.exports = {
  // Simplified addBook function with "lastname, firstname" search option
  addBook: async (bookData) => {
    try {
      log(`\n========== Starting to add book ==========`);
      log(`Original request: "${bookData.title}" by ${bookData.author}`);
      
      // Preprocess the input to handle ambiguous formats
      const processedData = preprocessBookData(bookData);
      log(`Processed request: "${processedData.title}" by ${processedData.author}`);
      
      // Step 1: Get profiles needed for creating authors/books
      const [qualityProfiles, metadataProfiles, rootFolders] = await Promise.all([
        readarrAPI.get('/api/v1/qualityprofile'),
        readarrAPI.get('/api/v1/metadataprofile'),
        readarrAPI.get('/api/v1/rootfolder')
      ]);

      if (!qualityProfiles.data?.length) throw new Error('No quality profiles found');
      if (!metadataProfiles.data?.length) throw new Error('No metadata profiles found');
      if (!rootFolders.data?.length) throw new Error('No root folders found');

      const qualityProfileId = qualityProfiles.data[0].id;
      const metadataProfileId = metadataProfiles.data[0].id;
      const rootFolderPath = rootFolders.data[1].path;

      log(`Using profiles - Quality: ${qualityProfileId}, Metadata: ${metadataProfileId}, Root: ${rootFolderPath}`);

      // Step 2: Check if the author already exists
      let authorId = null;
      log(`Checking if author exists: ${processedData.author}`);
      
      const existingAuthorsResponse = await readarrAPI.get('/api/v1/author');
      
      // Look for exact author match first (case-insensitive)
      if (existingAuthorsResponse.data?.length) {
        const exactAuthorMatch = existingAuthorsResponse.data.find(a => 
          normalizeText(a.authorName) === normalizeText(processedData.author));
          
        if (exactAuthorMatch) {
          authorId = exactAuthorMatch.id;
          log(`Found existing author: ${exactAuthorMatch.authorName} with ID: ${authorId}`);
        }
      }

      // Step 3: If author doesn't exist, search for and add them
      if (!authorId) {
        // Generate both normal and lastname first formats for searching
        const standardAuthorName = processedData.author;
        const lastnameFirstAuthor = getLastnameFirstFormat(standardAuthorName);
        
        log(`Author not found. Will try both name formats:
        - Standard format: ${standardAuthorName}
        - Lastname first: ${lastnameFirstAuthor}`);
        
        // Try to search with lastname, firstname format first
        let authorLookupResponse;
        let authorSearchResults = [];
        
        try {
          // First search with lastname, firstname format
          authorLookupResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(lastnameFirstAuthor)}`);
          authorSearchResults = authorLookupResponse.data || [];
          log(`Search with "${lastnameFirstAuthor}" found ${authorSearchResults.length} results`);
          
          // If no results with lastname first, try standard format
          if (authorSearchResults.length === 0) {
            log(`No results with lastname first format. Trying standard name format.`);
            authorLookupResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(standardAuthorName)}`);
            authorSearchResults = authorLookupResponse.data || [];
            log(`Search with "${standardAuthorName}" found ${authorSearchResults.length} results`);
          }
        } catch (error) {
          // If any error occurs, try the standard format
          log(`Error with lastname first search: ${error.message}. Trying standard format.`);
          authorLookupResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(standardAuthorName)}`);
          authorSearchResults = authorLookupResponse.data || [];
        }
        
        if (!authorSearchResults.length) {
          throw new Error(`Author "${processedData.author}" not found in Readarr database`);
        }
        
        // Find exact author match or best match
        let authorToAdd = null;
        
        // Try exact match with both name formats
        authorToAdd = authorSearchResults.find(a => 
          normalizeText(a.authorName) === normalizeText(standardAuthorName) ||
          normalizeText(a.authorName) === normalizeText(lastnameFirstAuthor));
        
        // If no exact match, use the first result
        if (!authorToAdd) {
          log(`No exact author name match found. Using first search result.`);
          authorToAdd = authorSearchResults[0];
        }
        
        log(`Adding author: ${authorToAdd.authorName}`);
        
        // Create author payload
        const authorPayload = {
          authorName: authorToAdd.authorName,
          foreignAuthorId: authorToAdd.foreignAuthorId,
          titleSlug: authorToAdd.titleSlug,
          qualityProfileId: qualityProfileId,
          metadataProfileId: metadataProfileId,
          rootFolderPath: rootFolderPath,
          monitored: true,
          monitorNewItems: "none",
          addOptions: {
            monitor: "none",
            searchForMissingBooks: false
          }
        };

        // Add author to Readarr
        const authorResponse = await readarrAPI.post('/api/v1/author', authorPayload);
        authorId = authorResponse.data.id;
        log(`Created new author with ID: ${authorId}`);

        // Wait for Readarr to process the new author
        log('Waiting for Readarr to process the new author...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Step 4: Now that we have the author, look for the book
      log(`Getting books for author ID: ${authorId}`);
      let targetBook = null;
      
      try {
        // Get all books for this author
        const authorBooksResponse = await readarrAPI.get(`/api/v1/book?authorId=${authorId}&includeAllAuthorBooks=true`);
        const booksList = authorBooksResponse.data || [];
        log(`Found ${booksList.length} books for author`);
        
        // Check if book already exists for this author
        if (booksList.length > 0) {
          // Look for exact match first
          targetBook = booksList.find(book => 
            normalizeText(book.title) === normalizeText(processedData.title));
          
          if (targetBook) {
            log(`Found exact title match in author's library: "${targetBook.title}" with ID: ${targetBook.id}`);
          }
        }
      } catch (error) {
        log(`Error getting author's books: ${error.message}. Will proceed to search for the book.`);
      }

      // Step 5: If book doesn't exist, search for and add it
      if (!targetBook) {
        log(`Book not found in author's library. Searching for book: ${processedData.title}`);
        
        // Search for the book
        const searchTerm = `${processedData.title} ${processedData.author}`;
        const bookLookupResponse = await readarrAPI.get(`/api/v1/book/lookup?term=${encodeURIComponent(searchTerm)}`);
        
        if (!bookLookupResponse.data?.length) {
          throw new Error(`Book "${processedData.title}" not found in Readarr database`);
        }
        
        // Find best book match
        let bookToAdd = null;
        
        // First try exact match on title and author
        bookToAdd = bookLookupResponse.data.find(book => 
          normalizeText(book.title) === normalizeText(processedData.title) && 
          book.authorName && normalizeText(book.authorName) === normalizeText(processedData.author));
        
        // If no exact match, use the first result that matches this author
        if (!bookToAdd) {
          // Find books matching our author
          const authorBooks = bookLookupResponse.data.filter(book =>
            book.authorId === authorId || 
            (book.authorName && normalizeText(book.authorName) === normalizeText(processedData.author)));
          
          if (authorBooks.length > 0) {
            bookToAdd = authorBooks[0]; // Use first matching book
          } else {
            // If no author match, use first result
            log(`No book matching both title and author found. Using first search result.`);
            bookToAdd = bookLookupResponse.data[0];
          }
        }
        
        log(`Adding book: "${bookToAdd.title}" by ${bookToAdd.authorName || processedData.author}`);
        
        // Create book payload
        const bookPayload = {
          authorId: authorId,
          foreignBookId: bookToAdd.foreignBookId,
          title: bookToAdd.title,
          qualityProfileId: qualityProfileId,
          metadataProfileId: metadataProfileId,
          rootFolderPath: rootFolderPath,
          monitored: true,
          addOptions: {
            searchForNewBook: false // We'll trigger search separately
          }
        };
        
        // Add book to Readarr
        const addResponse = await readarrAPI.post('/api/v1/book', bookPayload);
        targetBook = addResponse.data;
        log(`Book added to library with ID: ${targetBook.id}`);
      }

      // Step 6: Trigger search for the book
      log(`Triggering search for book ID: ${targetBook.id}`);

      const searchPayload = {
        name: "BookSearch",
        bookIds: [targetBook.id]
      };

      try {
        const searchResponse = await readarrAPI.post('/api/v1/command', searchPayload);
        log(`Search command successful: Command ID: ${searchResponse.data.id}, Status: ${searchResponse.data.status}`);

        // Return the book with search information
        return {
          ...targetBook,
          searchCommandId: searchResponse.data.id,
          searchStatus: searchResponse.data.status
        };
      } catch (searchError) {
        log(`WARNING: Book was found/added but search command failed: ${searchError.message}`);
        log(`You may need to manually search for this book in Readarr`);

        // Return the book anyway since we found/added it
        return {
          ...targetBook,
          searchStatus: 'failed',
          searchError: searchError.message
        };
      }
    } catch (error) {
      log(`ERROR: ${error.message}`);
      throw error;
    }
  },

  getBookStatus: async (bookId) => {
    try {
      log(`Checking status for book ID: ${bookId}`);
  
      // Get the book details
      const bookResponse = await readarrAPI.get(`/api/v1/book/${bookId}`);
  
      if (!bookResponse.data) {
        throw new Error(`Book with ID ${bookId} not found`);
      }
      
      // Check if the book has been downloaded
      const isDownloaded = bookResponse.data.statistics?.bookFileCount > 0;
      const percentOfBook = bookResponse.data.statistics?.percentOfBooks || 0;
  
      log(`Book status: Downloaded=${isDownloaded}, Percent=${percentOfBook}%`);
      
      // Additional info - get book file details if available
      let bookFilePath = null;
      if (isDownloaded) {
        try {
          // Get book file info
          const bookFileResponse = await readarrAPI.get(`/api/v1/bookFile`, {
            params: { bookId }
          });
          
          if (bookFileResponse.data && bookFileResponse.data.length > 0) {
            bookFilePath = bookFileResponse.data[0].path;
            log(`Book file path: ${bookFilePath}`);
          } else {
            log(`No book files found for book ID: ${bookId}`);
          }
        } catch (fileError) {
          log(`Error getting book file: ${fileError.message}`);
        }
      }
  
      return {
        id: bookId,
        title: bookResponse.data.title,
        isDownloaded: isDownloaded,
        percentOfBook: percentOfBook,
        hasFile: bookResponse.data.statistics?.bookFileCount > 0,
        sizeOnDisk: bookResponse.data.statistics?.sizeOnDisk || 0,
        bookFilePath: bookFilePath
      };
    } catch (error) {
      log(`Error checking book status: ${error.message}`);
      throw error;
    }
  }
};