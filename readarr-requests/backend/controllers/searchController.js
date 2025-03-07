// Enhanced searchController.js with improved relevance scoring algorithms
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
 * Common stop words to be weighted less in search relevance
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'on', 'in', 'with', 'by', 'to', 'for'
]);

/**
 * Calculate similarity between two strings (0-1) with improved multi-word handling
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
  
  // Split into words
  const words1 = normalStr1.split(/\s+/).filter(w => w);
  const words2 = normalStr2.split(/\s+/).filter(w => w);
  
  // Exact match after normalization is perfect score
  const joined1 = words1.join(' ');
  const joined2 = words2.join(' ');
  if (joined1 === joined2) return 1;
  
  // Check for complete containment (one string fully contains the other)
  if (joined1.includes(joined2)) return 0.95;
  if (joined2.includes(joined1)) return 0.95;
  
  // Generate word sets with weights (lower for stop words)
  const getWeightedWords = (words) => {
    return words.map(word => ({
      word, 
      weight: STOP_WORDS.has(word) ? 0.2 : 1
    }));
  };
  
  const weightedWords1 = getWeightedWords(words1);
  const weightedWords2 = getWeightedWords(words2);
  
  // Calculate matching words score, accounting for weights
  let totalWeight1 = weightedWords1.reduce((sum, w) => sum + w.weight, 0);
  let totalWeight2 = weightedWords2.reduce((sum, w) => sum + w.weight, 0);
  let matchScore = 0;
  
  // Check individual word matches
  for (const { word: word1, weight: weight1 } of weightedWords1) {
    const matchingWordObj = weightedWords2.find(w => w.word === word1);
    if (matchingWordObj) {
      // Add the average of the weights for this match
      matchScore += (weight1 + matchingWordObj.weight) / 2;
    }
  }
  
  // Normalize by total possible match score (average of both total weights)
  const possibleScore = (totalWeight1 + totalWeight2) / 2;
  const wordMatchScore = matchScore / possibleScore;
  
  // Check for phrase matches (consecutive matching words)
  let phraseMatchBonus = 0;
  
  // Check for each possible phrase length from both strings
  for (let length = Math.min(words1.length, words2.length); length >= 2; length--) {
    // Try to find phrases of this length in both strings
    for (let i = 0; i <= words1.length - length; i++) {
      const phrase1 = words1.slice(i, i + length).join(' ');
      
      for (let j = 0; j <= words2.length - length; j++) {
        const phrase2 = words2.slice(j, j + length).join(' ');
        
        if (phrase1 === phrase2) {
          // Longer matching phrases get higher bonuses
          phraseMatchBonus = Math.max(phraseMatchBonus, 0.1 * length);
          // Once we found a match of this length, we can break this loop
          break;
        }
      }
    }
    
    // If we found a phrase match of this length, we can skip checking shorter lengths
    if (phraseMatchBonus > 0) break;
  }
  
  // Also check for title prefix - if the search query is the beginning of the title
  let prefixMatchBonus = 0;
  if (words2.length <= words1.length) {
    const potentialPrefix = words1.slice(0, words2.length).join(' ');
    if (potentialPrefix === joined2) {
      prefixMatchBonus = 0.3;
    }
  }
  
  // Check consecutive matching words (n-gram matches)
  let consecutiveMatchBonus = 0;
  let currentConsecutive = 0;
  let maxConsecutive = 0;
  
  // Check for consecutive matches in the second string
  for (let i = 0; i < words2.length; i++) {
    if (words1.includes(words2[i])) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }
  
  if (maxConsecutive >= 2) {
    consecutiveMatchBonus = 0.05 * maxConsecutive;
  }
  
  // Check for initial word match (first word)
  let initialWordBonus = 0;
  if (words1.length > 0 && words2.length > 0 && words1[0] === words2[0]) {
    initialWordBonus = words1[0].length > 3 ? 0.15 : 0.05; // Higher for non-stop words
  }
  
  // If no word matches or very poor similarity, use Levenshtein
  if (wordMatchScore < 0.2) {
    // Calculate Levenshtein distance
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
    
    const distance = levenshteinDistance(joined1, joined2);
    const maxLength = Math.max(joined1.length, joined2.length);
    const levSimilarity = maxLength > 0 ? 1 - (distance / maxLength) : 0;
    
    // Use Levenshtein similarity if it's better than word matching
    return Math.max(0.1, levSimilarity, wordMatchScore);
  }
  
  // Combine all scores with appropriate weights
  return Math.min(1, wordMatchScore + phraseMatchBonus + prefixMatchBonus + 
                  consecutiveMatchBonus + initialWordBonus);
}

/**
 * Tokenize a query into important keywords with weights
 * @param {string} query - Search query
 * @returns {Array} - Array of {word, weight} objects
 */
function tokenizeQuery(query) {
  if (!query) return [];
  
  // Normalize and split into words
  const words = query.toLowerCase()
                     .replace(/[^\w\s]/g, '')
                     .trim()
                     .split(/\s+/)
                     .filter(w => w);
  
  return words.map(word => ({
    word,
    weight: STOP_WORDS.has(word) ? 0.3 : 1 // Lower weight for stop words
  }));
}

/**
 * Calculate relevance score for a book based on search query
 * @param {object} book - Book object to score
 * @param {string} query - Search query
 * @returns {number} Relevance score (higher is better)
 */
function calculateRelevanceScore(book, query) {
  if (!book || !query) return 0;
  
  // Normalize query and book title for calculations
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedTitle = book.title ? book.title.toLowerCase().trim() : '';
  const normalizedAuthor = book.author ? book.author.toLowerCase().trim() : '';
  
  // Build base relevance scores
  
  // 1. Title similarity - most important factor
  const titleSimilarity = calculateStringSimilarity(book.title, normalizedQuery);
  
  // 2. Special case: Exact title match gets very high score
  const exactTitleMatch = normalizedTitle === normalizedQuery ? 10 : 0;
  
  // 3. Title starts with query for shorter queries
  const titleStartsWithQuery = normalizedTitle.startsWith(normalizedQuery) ? 
                              Math.min(3, 10 * normalizedQuery.length / normalizedTitle.length) : 0;
  
  // 4. Author similarity
  let authorSimilarity = 0;
  if (book.author) {
    authorSimilarity = calculateStringSimilarity(book.author, normalizedQuery);
  }
  
  // 5. Query words in title
  const queryWords = tokenizeQuery(normalizedQuery);
  let wordMatchScore = 0;
  let totalWeight = queryWords.reduce((sum, w) => sum + w.weight, 0);
  
  for (const { word, weight } of queryWords) {
    if (normalizedTitle.includes(word)) {
      wordMatchScore += weight;
    }
  }
  
  // Normalize word match score
  const normalizedWordMatchScore = totalWeight > 0 ? 
                                  wordMatchScore / totalWeight : 0;
  
  // Build composite score with weighted components
  let score = 0;
  
  // Title is most important - base score
  score += titleSimilarity * 6;
  
  // Exact title match is critical - huge boost
  score += exactTitleMatch;
  
  // Title starts with query - good boost
  score += titleStartsWithQuery;
  
  // Words from query in title - decent boost
  score += normalizedWordMatchScore * 2;
  
  // Author match - smaller boost
  score += authorSimilarity * 0.7;
  
  // Quality signals to slightly boost good books
  if (book.cover) {
    score += 0.2; // Has cover image
  }
  
  if (book.rating > 0) {
    score += Math.min(0.5, book.rating / 10); // Up to 0.5 for ratings
  }
  
  // Recent books could be slightly preferred
  if (book.year) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - book.year;
    // Small recency bonus, max 0.3 for current year
    if (age <= 10) {
      score += Math.max(0, 0.3 - (age * 0.03));
    }
  }
  
  // Log high-scoring books for debugging
  if (score > 7) {
    log(`High relevance score ${score.toFixed(2)} for book: "${book.title}" on query "${query}"`);
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
    
    // Score and sort each result set independently with our enhanced algorithm
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
      
      // Deduplicate by title and author with improved logic
      const seen = new Map();
      const deduplicatedResults = [];
      
      for (const book of combinedResults) {
        // Create a key that combines title and author for deduplication
        const key = `${book.title}|${book.author}`.toLowerCase();
        
        // Keep track of highest scoring books for each title/author
        if (seen.has(key)) {
          const existingIndex = seen.get(key);
          const existingBook = deduplicatedResults[existingIndex];
          
          // If new book has higher score or better data, replace the existing one
          if (book.relevanceScore > existingBook.relevanceScore || 
              (book.cover && !existingBook.cover) ||
              (book.year && !existingBook.year)) {
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
      
      // Log the most relevant results for debugging
      if (results.combined.length > 0) {
        const topResult = results.combined[0];
        log(`Top result for "${query}": "${topResult.title}" by ${topResult.author} (Score: ${topResult.relevanceScore.toFixed(2)})`);
      }
      
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

// The rest of your controller functions remain the same
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