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
 * Calculate similarity between two strings (0-1)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  // Normalize strings for comparison
  const normalize = (s) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const normalStr1 = normalize(str1);
  const normalStr2 = normalize(str2);
  
  // Exact match is perfect score
  if (normalStr1 === normalStr2) return 1;
  
  // Check if one string contains the other fully
  if (normalStr1.includes(normalStr2)) return 0.9;
  if (normalStr2.includes(normalStr1)) return 0.9;
  
  // Calculate word match ratio
  const words1 = normalStr1.split(/\s+/);
  const words2 = normalStr2.split(/\s+/);
  
  let matchingWords = 0;
  for (const word of words1) {
    if (word.length > 1 && words2.includes(word)) {
      matchingWords++;
    }
  }
  
  // If we have matching words, calculate word match score
  if (words1.length > 0 && words2.length > 0) {
    const wordMatchRatio = (matchingWords * 2) / (words1.length + words2.length);
    return Math.max(0.2, wordMatchRatio); // Minimum score if at least some words match
  }
  
  // Check if strings have any significant overlap
  const minLength = Math.min(normalStr1.length, normalStr2.length);
  const maxLength = Math.max(normalStr1.length, normalStr2.length);
  
  // Calculate Levenshtein distance (string edit distance)
  const levenshteinDistance = (s1, s2) => {
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;
    
    const matrix = Array(s1.length + 1).fill().map(() => Array(s2.length + 1).fill(0));
    
    for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i-1] === s2[j-1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i-1][j] + 1,        // deletion
          matrix[i][j-1] + 1,        // insertion
          matrix[i-1][j-1] + cost    // substitution
        );
      }
    }
    
    return matrix[s1.length][s2.length];
  };
  
  const distance = levenshteinDistance(normalStr1, normalStr2);
  const similarity = 1 - (distance / maxLength);
  
  return Math.max(0, similarity);
}

/**
 * Calculate relevance score for a book based on search query
 * @param {object} book - Book object to score
 * @param {string} query - Search query
 * @returns {number} Relevance score (higher is better)
 */
function calculateRelevanceScore(book, query) {
  if (!book || !query) return 0;
  
  // Normalize query for comparison
  const normalizedQuery = query.toLowerCase().trim();
  
  // Calculate base scores
  const titleSimilarity = calculateStringSimilarity(book.title, normalizedQuery);
  const titleStartsWithQuery = book.title.toLowerCase().startsWith(normalizedQuery) ? 0.3 : 0;
  
  // Title is the most important factor
  let score = titleSimilarity * 5; // Base title score, maximum of 5 points
  score += titleStartsWithQuery; // Bonus if title starts with query
  
  // Calculate score for author if search contains author name
  if (book.author) {
    const authorSimilarity = calculateStringSimilarity(book.author, normalizedQuery);
    score += authorSimilarity * 0.5; // Author match is worth less than title
  }
  
  // Bonuses for exact matches
  if (book.title.toLowerCase() === normalizedQuery) {
    score += 5; // Big bonus for exact title match
  }
  
  // Add a small boost for books with images
  if (book.cover) {
    score += 0.2;
  }
  
  // Add a bonus for highly rated books
  if (book.rating > 0) {
    score += Math.min(0.5, book.rating / 10); // Max 0.5 for a perfect rating
  }
  
  return score;
}

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
    
    // Score and sort each result set independently
    if (results.google.length > 0) {
      // Score and sort Google results
      results.google = results.google.map(book => ({
        ...book,
        relevanceScore: calculateRelevanceScore(book, query)
      })).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    
    if (results.openLibrary.length > 0) {
      // Score and sort OpenLibrary results
      results.openLibrary = results.openLibrary.map(book => ({
        ...book,
        relevanceScore: calculateRelevanceScore(book, query)
      })).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    
    // Combine and deduplicate results if needed
    if (source === 'all') {
      // Combine results, keeping the relevance scores
      const combinedResults = [
        ...results.google.map(book => ({...book, source: 'google'})),
        ...results.openLibrary.map(book => ({...book, source: 'openLibrary'}))
      ];
      
      // Deduplicate by title and author
      const seen = new Map();
      const deduplicatedResults = [];
      
      for (const book of combinedResults) {
        const key = `${book.title}|${book.author}`.toLowerCase();
        
        // If we've seen this book before and the current book has a higher score, replace it
        if (seen.has(key)) {
          const existingIndex = seen.get(key);
          if (book.relevanceScore > deduplicatedResults[existingIndex].relevanceScore) {
            deduplicatedResults[existingIndex] = book;
          }
        } else {
          // New book, add it to the results
          seen.set(key, deduplicatedResults.length);
          deduplicatedResults.push(book);
        }
      }
      
      // Final sort by relevance score
      results.combined = deduplicatedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      log(`Combined results: ${results.combined.length} books after deduplication and sorting`);
    }
    
    // Create response data
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

/**
 * Helper function to combine and deduplicate results from multiple sources with improved relevance ranking
 * @param {Array} googleBooks - Google Books results
 * @param {Array} openLibraryBooks - Open Library results
 * @param {string} query - Original search query
 * @returns {Array} - Combined, deduplicated, and ranked results
 */
function combineAndDeduplicate(googleBooks, openLibraryBooks, query) {
  // Add source information and calculate relevance scores
  const combinedBooks = [
    ...googleBooks.map(book => ({
      ...book, 
      source: 'google',
      relevanceScore: calculateRelevanceScore(book, query)
    })),
    ...openLibraryBooks.map(book => ({
      ...book, 
      source: 'openLibrary',
      relevanceScore: calculateRelevanceScore(book, query)
    }))
  ];
  
  // Basic deduplication by title and author
  const seen = new Map();
  const results = [];
  
  for (const book of combinedBooks) {
    const key = `${book.title}|${book.author}`.toLowerCase();
    
    // If we've seen this book before and the current book has a higher score, replace it
    if (seen.has(key)) {
      const existingIndex = seen.get(key);
      if (book.relevanceScore > results[existingIndex].relevanceScore) {
        results[existingIndex] = book;
      }
    } else {
      // New book, add it to the results
      seen.set(key, results.length);
      results.push(book);
    }
  }
  
  // Final sort by relevance score
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}