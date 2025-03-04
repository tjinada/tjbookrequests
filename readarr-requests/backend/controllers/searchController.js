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

    // Pre-check with Readarr to add availability information
    if (results.combined.length > 0 || results[source].length > 0) {
      const booksToCheck = source === 'all' ? results.combined : results[source];
      await addReadarrAvailabilityInfo(booksToCheck);
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
    
    if (source === 'google') {
      bookDetails = await googleBooksAPI.getBookDetails(id);
    } else if (source === 'openLibrary') {
      bookDetails = await openLibraryAPI.getBookDetails(id);
    } else {
      return res.status(400).json({ message: 'Invalid source specified' });
    }

    // Check Readarr availability for this book
    try {
      const readarrInfo = await checkReadarrAvailability(bookDetails.title, bookDetails.author);
      bookDetails.readarrInfo = readarrInfo;
    } catch (readarrErr) {
      log(`Error checking Readarr availability: ${readarrErr.message}`);
      // Don't fail the whole request if Readarr check fails
    }
    
    res.json(bookDetails);
  } catch (err) {
    log(`Error getting book details: ${err.message}`);
    console.error('Error getting book details:', err);
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
    
    // Get author information for better matching
    let authorInfo = null;
    
    if (source === 'google' && bookDetails.author) {
      // Extract the primary author (first in the list)
      const primaryAuthor = bookDetails.author.split(',')[0].trim();
      try {
        authorInfo = await googleBooksAPI.searchAuthor(primaryAuthor);
      } catch (authorErr) {
        log(`Error getting author info: ${authorErr.message}, will continue without it`);
      }
    }
    
    // Prepare data for Readarr
    const bookData = {
      title: bookDetails.title,
      author: bookDetails.author,
      isbn: bookDetails.isbn,
      // Pass additional metadata for better matching
      authorMetadata: authorInfo ? {
        name: authorInfo.name,
        books: authorInfo.books?.length || 0,
        genres: authorInfo.primaryGenres || []
      } : null,
      bookMetadata: {
        title: bookDetails.title,
        source: source,
        sourceId: bookId,
        publishYear: bookDetails.year
      }
    };
    
    // Pre-check with Readarr
    const readarrCheck = await checkReadarrAvailability(bookDetails.title, bookDetails.author);
    
    // If the book is already in Readarr, return that information
    if (readarrCheck.bookResults && readarrCheck.bookResults.length > 0) {
      return res.json({
        success: true,
        message: 'Book already exists in Readarr',
        bookDetails: readarrCheck.bookResults[0],
        status: 'existing'
      });
    }
    
    // Add the book to Readarr
    const result = await readarrAPI.addBook(bookData);
    
    res.json({
      success: true,
      message: 'Book added successfully',
      bookDetails: result,
      status: 'added'
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
    
    const readarrCheck = await checkReadarrAvailability(title, author);
    return res.json({
      success: true,
      ...readarrCheck
    });
  } catch (error) {
    log(`Error in direct Readarr search: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to check Readarr availability
async function checkReadarrAvailability(title, author) {
  try {
    // First search for the exact author
    let authorResults = [];
    let bookResults = [];
    
    if (author) {
      try {
        const authorResponse = await readarrAPI.testAuthorMatch(author);
        if (authorResponse.success) {
          authorResults = [authorResponse.bestMatch].filter(Boolean);
        }
      } catch (authorError) {
        log(`Error searching for author in Readarr: ${authorError.message}`);
      }
      
      // If we have an author match and a title, search for books
      if (authorResults.length > 0 && title) {
        try {
          const bookResponse = await readarrAPI.testBookMatch(title, author);
          if (bookResponse.success && bookResponse.bestMatch) {
            bookResults = [bookResponse.bestMatch];
          }
        } catch (bookError) {
          log(`Error searching for book in Readarr: ${bookError.message}`);
        }
      }
    } else if (title) {
      // Search by title only
      try {
        const bookResponse = await readarrAPI.testBookMatch(title, '');
        if (bookResponse.success && bookResponse.bestMatch) {
          bookResults = [bookResponse.bestMatch];
        }
      } catch (bookError) {
        log(`Error searching for book by title in Readarr: ${bookError.message}`);
      }
    }
    
    return {
      query: { title, author },
      authorResults,
      bookResults,
      inReadarr: bookResults.length > 0
    };
  } catch (error) {
    log(`Error checking Readarr availability: ${error.message}`);
    throw error;
  }
}

// Helper function to add Readarr availability info to multiple books
async function addReadarrAvailabilityInfo(books) {
  try {
    const promises = books.map(async (book) => {
      try {
        const readarrInfo = await checkReadarrAvailability(book.title, book.author);
        book.readarrInfo = {
          inReadarr: readarrInfo.bookResults && readarrInfo.bookResults.length > 0,
          authorInReadarr: readarrInfo.authorResults && readarrInfo.authorResults.length > 0
        };
      } catch (error) {
        // Don't fail the entire batch if one book fails
        log(`Error checking Readarr for book "${book.title}": ${error.message}`);
        book.readarrInfo = { inReadarr: false, authorInReadarr: false, error: true };
      }
    });
    
    await Promise.all(promises);
  } catch (error) {
    log(`Error batch checking Readarr availability: ${error.message}`);
  }
}

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