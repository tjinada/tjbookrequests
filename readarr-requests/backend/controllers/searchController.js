// controllers/searchController.js
const googleBooksAPI = require('../config/googleBooks');
const openLibraryAPI = require('../config/openLibrary');
const readarrAPI = require('../config/readarr');
const fs = require('fs');
const path = require('path');

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/search.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

/**
 * Search for books across multiple sources
 */
exports.searchBooks = async (req, res) => {
  try {
    const { query, source = 'all', limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    log(`Searching for books with query: "${query}", source: ${source}, limit: ${limit}`);
    
    let results = { google: [], openLibrary: [], combined: [] };
    
    // Perform searches based on selected source
    if (source === 'all' || source === 'google') {
      results.google = await googleBooksAPI.searchBooks(query, parseInt(limit));
      log(`Found ${results.google.length} results from Google Books`);
    }
    
    if (source === 'all' || source === 'openLibrary') {
      results.openLibrary = await openLibraryAPI.searchBooks(query);
      log(`Found ${results.openLibrary.length} results from Open Library`);
    }
    
    // Combine and deduplicate results
    if (source === 'all') {
      results.combined = combineAndDeduplicate(results.google, results.openLibrary);
      log(`Combined results: ${results.combined.length} books`);
    }
    
    const responseData = {
      query,
      source,
      results: source === 'all' ? 
        { google: results.google, openLibrary: results.openLibrary, combined: results.combined } : 
        results[source] || []
    };
    
    res.json(responseData);
  } catch (err) {
    log(`Error searching books: ${err.message}`);
    console.error('Error searching books:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Get book details from a specific source
 */
exports.getBookDetails = async (req, res) => {
  try {
    const { id, source } = req.params;
    
    if (!id || !source) {
      return res.status(400).json({ message: 'Book ID and source are required' });
    }
    
    log(`Getting book details for ${source} ID: ${id}`);
    
    let bookDetails;
    
// controllers/searchController.js (continued)
if (source === 'google') {
    bookDetails = await googleBooksAPI.getBookDetails(id);
  } else if (source === 'openLibrary') {
    bookDetails = await openLibraryAPI.getBookDetails(id);
  } else {
    return res.status(400).json({ message: 'Invalid source specified' });
  }
  
  res.json(bookDetails);
} catch (err) {
  log(`Error getting book details: ${err.message}`);
  console.error('Error getting book details:', err);
  res.status(500).json({ message: 'Server error', error: err.message });
}
};

/**
* Search for books by an exact author name
*/
exports.searchBooksByAuthor = async (req, res) => {
try {
  const { author, source = 'google' } = req.query;
  
  if (!author) {
    return res.status(400).json({ message: 'Author name is required' });
  }
  
  log(`Searching for books by author: "${author}", source: ${source}`);
  
  let books = [];
  
  if (source === 'google') {
    books = await googleBooksAPI.searchBooksByAuthor(author);
  } else if (source === 'openLibrary') {
    // OpenLibrary doesn't have a direct author search, so we'll search by the author name
    books = await openLibraryAPI.searchBooks(`author:${author}`);
  } else {
    return res.status(400).json({ message: 'Invalid source specified' });
  }
  
  log(`Found ${books.length} books by author: "${author}"`);
  
  res.json({
    author,
    count: books.length,
    books
  });
} catch (err) {
  log(`Error searching books by author: ${err.message}`);
  console.error('Error searching books by author:', err);
  res.status(500).json({ message: 'Server error', error: err.message });
}
};

/**
* Get detailed author information
*/
exports.getAuthorInfo = async (req, res) => {
try {
  const { name, source = 'google' } = req.query;
  
  if (!name) {
    return res.status(400).json({ message: 'Author name is required' });
  }
  
  log(`Getting author information for: "${name}", source: ${source}`);
  
  let authorInfo = null;
  
  if (source === 'google') {
    authorInfo = await googleBooksAPI.searchAuthor(name);
  } else {
    return res.status(400).json({ message: 'Invalid source specified' });
  }
  
  if (!authorInfo) {
    return res.status(404).json({ message: `Author "${name}" not found` });
  }
  
  res.json(authorInfo);
} catch (err) {
  log(`Error getting author information: ${err.message}`);
  console.error('Error getting author information:', err);
  res.status(500).json({ message: 'Server error', error: err.message });
}
};

/**
* Add a book to Readarr using metadata from a specific source
*/
exports.addBookFromMetadata = async (req, res) => {
try {
  const { bookId, source } = req.body;
  
  if (!bookId || !source) {
    return res.status(400).json({ message: 'Book ID and source are required' });
  }
  
  log(`Adding book to Readarr from ${source} ID: ${bookId}`);
  
  // Get book details from the source
  let bookDetails;
  
  if (source === 'google') {
    bookDetails = await googleBooksAPI.getBookDetails(bookId);
  } else if (source === 'openLibrary') {
    bookDetails = await openLibraryAPI.getBookDetails(bookId);
  } else {
    return res.status(400).json({ message: 'Invalid source specified' });
  }
  
  if (!bookDetails) {
    return res.status(404).json({ message: 'Book not found' });
  }
  
  // Get author information
  let authorMetadata = null;
  
  if (source === 'google' && bookDetails.author) {
    // Extract the primary author (first in the list)
    const primaryAuthor = bookDetails.author.split(',')[0].trim();
    authorMetadata = await googleBooksAPI.searchAuthor(primaryAuthor);
  }
  
  // Prepare data for Readarr
  const bookData = {
    title: bookDetails.title,
    author: bookDetails.author,
    isbn: bookDetails.isbn,
    // Pass additional metadata for better matching
    authorMetadata: authorMetadata ? {
      name: authorMetadata.name,
      books: authorMetadata.books.length,
      genres: authorMetadata.primaryGenres
    } : null,
    bookMetadata: {
      title: bookDetails.title,
      source: source,
      sourceId: bookId,
      publishYear: bookDetails.year
    }
  };
  
  // Add the book to Readarr
  const result = await readarrAPI.addBook(bookData);
  
  res.json({
    success: true,
    message: 'Book added successfully',
    bookDetails: result
  });
} catch (err) {
  log(`Error adding book from metadata: ${err.message}`);
  console.error('Error adding book from metadata:', err);
  res.status(500).json({ message: 'Server error', error: err.message });
}
};

/**
* Direct search on Readarr with exact author/title
*/
exports.searchReadarr = async (req, res) => {
try {
  const { title, author } = req.query;
  
  if (!title && !author) {
    return res.status(400).json({ message: 'Title or author is required' });
  }
  
  log(`Direct Readarr search: title="${title}", author="${author}"`);
  
  // First search for the exact author
  let authorResults = [];
  let bookResults = [];
  
  if (author) {
    const authorResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(author)}`);
    authorResults = authorResponse.data || [];
    
    log(`Found ${authorResults.length} author matches in Readarr`);
    
    // Find exact author match
    const exactAuthorMatch = authorResults.find(a => 
      a.authorName.toLowerCase() === author.toLowerCase());
    
    if (exactAuthorMatch && title) {
      // If we have an exact author match and a title, search for books
      try {
        const bookSearchResponse = await readarrAPI.get(`/api/v1/book/lookup`, {
          params: {
            term: title
          }
        });
        
        bookResults = bookSearchResponse.data || [];
        log(`Found ${bookResults.length} book matches in Readarr`);
        
        // Filter book results to this author
        bookResults = bookResults.filter(book => 
          book.authorName && book.authorName.toLowerCase() === author.toLowerCase());
        
        log(`After filtering for author, found ${bookResults.length} matching books`);
      } catch (bookError) {
        log(`Error searching for books: ${bookError.message}`);
      }
    }
  } else if (title) {
    // Search by title only
    const bookSearchResponse = await readarrAPI.get(`/api/v1/book/lookup`, {
      params: {
        term: title
      }
    });
    
    bookResults = bookSearchResponse.data || [];
    log(`Found ${bookResults.length} book matches in Readarr for title: "${title}"`);
  }
  
  return res.json({
    success: true,
    query: { title, author },
    authorResults: authorResults.map(a => ({
      id: a.id,
      name: a.authorName,
      titleSlug: a.titleSlug,
      bookCount: a.bookCount || 0
    })),
    bookResults: bookResults.map(b => ({
      id: b.id,
      title: b.title,
      author: b.authorName,
      year: b.releaseDate ? new Date(b.releaseDate).getFullYear() : null,
      titleSlug: b.titleSlug,
      foreignBookId: b.foreignBookId
    }))
  });
} catch (error) {
  log(`Error in direct Readarr search: ${error.message}`);
  return res.status(500).json({ success: false, message: error.message });
}
};

// Helper function to combine and deduplicate results from multiple sources
function combineAndDeduplicate(googleBooks, openLibraryBooks) {
// Create a combined list with source information
const combined = [
  ...googleBooks.map(book => ({...book, source: 'google'})),
  ...openLibraryBooks.map(book => ({...book, source: 'openLibrary'}))
];

// Basic deduplication by title and author
const seen = new Set();
return combined.filter(book => {
  // Create a key using title and author
  const key = `${book.title}|${book.author}`.toLowerCase();
  
  // Skip if we've seen this book before
  if (seen.has(key)) return false;
  
  // Mark this book as seen and keep it
  seen.add(key);
  return true;
});
}