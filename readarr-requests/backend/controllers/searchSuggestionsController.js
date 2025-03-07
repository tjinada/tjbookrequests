// backend/controllers/searchSuggestionsController.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/search-suggestions.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

// Simple in-memory cache for suggestions
const cache = {
  suggestions: {},
  timestamp: {}
};

// Cache expiry time (1 hour)
const CACHE_EXPIRY = 60 * 60 * 1000;

/**
 * Get search suggestions for book titles and authors
 */
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { query, limit = 5 } = req.query;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check cache first
    if (
      cache.suggestions[normalizedQuery] && 
      Date.now() - cache.timestamp[normalizedQuery] < CACHE_EXPIRY
    ) {
      return res.json(cache.suggestions[normalizedQuery]);
    }
    
    log(`Getting search suggestions for: "${normalizedQuery}"`);
    
    // Try to get suggestions from OpenLibrary's autocomplete API
    const suggestions = await getOpenLibrarySuggestions(normalizedQuery, limit);
    
    // Update cache
    cache.suggestions[normalizedQuery] = suggestions;
    cache.timestamp[normalizedQuery] = Date.now();
    
    return res.json(suggestions);
  } catch (error) {
    log(`Error getting search suggestions: ${error.message}`);
    res.status(500).json({ message: 'Error generating suggestions', error: error.message });
  }
};

/**
 * Get search suggestions from OpenLibrary
 */
async function getOpenLibrarySuggestions(query, limit) {
  try {
    // Use OpenLibrary's autocomplete API
    const response = await axios.get(
      `https://openlibrary.org/search/autocomplete.json?q=${encodeURIComponent(query)}`
    );
    
    if (!response.data || !response.data.docs) {
      return [];
    }
    
    // Extract suggestions from the response
    const bookSuggestions = response.data.docs
      .filter(doc => doc.title && doc.author_name) // Filter valid results
      .map(doc => ({
        value: doc.title,
        display: `${doc.title} by ${doc.author_name[0]}`,
        type: 'book',
        author: doc.author_name[0],
        year: doc.first_publish_year
      }))
      .slice(0, Math.max(2, Math.floor(limit * 0.7))); // Allocate majority of slots to books
    
    // Also get author suggestions
    const authorSuggestions = response.data.docs
      .filter(doc => doc.author_name)
      .map(doc => doc.author_name[0]) // Extract author names
      .filter((value, index, self) => self.indexOf(value) === index) // Deduplicate
      .map(author => ({
        value: author,
        display: author,
        type: 'author'
      }))
      .slice(0, Math.floor(limit * 0.3)); // Allocate minority of slots to authors
    
    // Combine and format suggestions
    const combinedSuggestions = [
      ...bookSuggestions,
      ...authorSuggestions
    ].slice(0, limit);
    
    // Format final display strings
    return combinedSuggestions.map(suggestion => {
      if (suggestion.type === 'book') {
        let displayText = suggestion.value;
        
        // Add author if available
        if (suggestion.author) {
          displayText += ` by ${suggestion.author}`;
        }
        
        // Add year if available
        if (suggestion.year) {
          displayText += ` (${suggestion.year})`;
        }
        
        return displayText;
      }
      
      // For author suggestions, prepend "Author: "
      if (suggestion.type === 'author') {
        return `Author: ${suggestion.value}`;
      }
      
      return suggestion.value;
    });
  } catch (error) {
    log(`Error getting OpenLibrary suggestions: ${error.message}`);
    return [];
  }
}