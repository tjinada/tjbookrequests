// controllers/calibreManagerController.js
const calibreAPI = require('../config/calibreAPI');
const cache = require('../utils/calibreCache');
const fs = require('fs');
const path = require('path');

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/calibre-manager.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

/**
 * Get all books from Calibre library with proper pagination
 */
exports.getAllBooks = async (req, res) => {
  try {
    // Only admin can access this
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const query = req.query.query || '';
    const sortBy = req.query.sortBy || 'added';
    const sortOrder = req.query.sortOrder || 'desc';

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    log(`Fetching books from Calibre. Page: ${page}, Limit: ${limit}, Offset: ${offset}, Query: ${query}, Sort: ${sortBy} ${sortOrder}`);

    // Get books from Calibre with pagination
    const searchResult = await calibreAPI.searchBooks(query ? query : '*', {
      offset: offset,
      limit: limit,
      sort: sortBy,
      sortOrder: sortOrder
    });
    
    log(`Found ${searchResult.total} total books, returning ${searchResult.books.length} for current page`);

    // Process books to standardize format
    const books = searchResult.books.map(book => {
      return {
        id: book.id,
        title: book.title || 'Unknown Title',
        author: book.author || 'Unknown Author',
        tags: book.tags || [],
        formats: book.formats || [],
        cover: book.cover || null,
        thumbnail: book.thumbnail || null,
        added: book.added || '',
        rating: book.rating || 0,
        publisher: book.publisher || ''
      };
    });

    // Build pagination info
    const pagination = {
      total: searchResult.total,
      page,
      limit,
      pages: Math.ceil(searchResult.total / limit),
      hasMore: offset + limit < searchResult.total,
      showing: {
        from: offset + 1,
        to: Math.min(offset + limit, searchResult.total)
      }
    };

    res.json({
      books: books,
      pagination
    });
  } catch (error) {
    log(`Error fetching books: ${error.message}`);
    res.status(500).json({ message: 'Error fetching books from Calibre', error: error.message });
  }
};

/**
 * Get book details from Calibre
 */
exports.getBookDetails = async (req, res) => {
  try {
    // Only admin can access this
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    log(`Fetching details for book ID: ${id}`);

    // Get book details from Calibre
    const bookDetails = await calibreAPI.getBookDetails(id);
    
    res.json(bookDetails);
  } catch (error) {
    log(`Error fetching book details: ${error.message}`);
    res.status(500).json({ message: 'Error fetching book details from Calibre', error: error.message });
  }
};

/**
 * Update book tags in Calibre
 */
exports.updateBookTags = async (req, res) => {
  try {
    // Only admin can access this
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ message: 'Tags must be provided as an array' });
    }

    log(`Updating tags for book ID: ${id}`);
    log(`New tags: ${tags.join(', ')}`);

    // Update book tags in Calibre
    await calibreAPI.updateBookTags(id, tags);
    
    res.json({ 
      message: 'Tags updated successfully',
      bookId: id,
      tags
    });
  } catch (error) {
    log(`Error updating book tags: ${error.message}`);
    res.status(500).json({ message: 'Error updating book tags in Calibre', error: error.message });
  }
};

/**
 * Update multiple book tags in Calibre (bulk operation)
 */
exports.bulkUpdateTags = async (req, res) => {
  try {
    // Only admin can access this
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { books } = req.body;
    
    if (!books || !Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ message: 'At least one book must be provided' });
    }

    log(`Bulk updating tags for ${books.length} books`);
    
    const results = {
      successful: [],
      failed: []
    };

    // Process each book
    for (const book of books) {
      try {
        if (!book.id || !book.tags || !Array.isArray(book.tags)) {
          results.failed.push({
            id: book.id || 'unknown',
            error: 'Invalid book data format'
          });
          continue;
        }

        log(`Updating tags for book ID: ${book.id}`);
        log(`New tags: ${book.tags.join(', ')}`);

        // Update book tags in Calibre
        await calibreAPI.updateBookTags(book.id, book.tags);
        
        results.successful.push({
          id: book.id,
          tags: book.tags
        });
      } catch (error) {
        log(`Error updating tags for book ID ${book.id}: ${error.message}`);
        results.failed.push({
          id: book.id,
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Updated tags for ${results.successful.length} books, ${results.failed.length} failed`,
      results
    });
  } catch (error) {
    log(`Error in bulk update: ${error.message}`);
    res.status(500).json({ message: 'Error performing bulk tag update', error: error.message });
  }
};

/**
 * Clear the Calibre cache
 */
exports.clearCache = async (req, res) => {
  try {
    // Only admin can access this
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    log('Clearing Calibre cache');
    
    const cleared = cache.clearCache();
    
    if (cleared) {
      res.json({ 
        message: 'Cache cleared successfully',
        success: true
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to clear cache',
        success: false
      });
    }
  } catch (error) {
    log(`Error clearing cache: ${error.message}`);
    res.status(500).json({ message: 'Error clearing cache', error: error.message });
  }
};