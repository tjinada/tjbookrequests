// utils/bookMatching.js
/**
 * Utility functions for book title and author comparison
 */

/**
 * Calculate string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score between 0 and 1
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
    const maxLength = Math.max(normalStr1.length, normalStr2.length);
    const similarity = 1 - (distance / maxLength);
    
    return Math.max(0, similarity);
  }
  
  /**
   * Advanced book matching algorithm
   * @param {Object} requestedBook - Book being requested 
   * @param {Array} calibreBooks - Array of books from Calibre library
   * @param {number} threshold - Similarity threshold (0-1)
   * @returns {Object|null} - Best matching book or null if no good match
   */
  function findBestBookMatch(requestedBook, calibreBooks, threshold = 0.8) {
    if (!requestedBook || !requestedBook.title || !requestedBook.author || !calibreBooks || !Array.isArray(calibreBooks)) {
      return null;
    }
    
    const reqTitle = requestedBook.title;
    const reqAuthor = requestedBook.author;
    
    // Track best match and its score
    let bestMatch = null;
    let bestScore = 0;
    
    for (const book of calibreBooks) {
      // Skip books without title or author
      if (!book.title || !book.author) continue;
      
      // Calculate title similarity
      const titleSimilarity = calculateStringSimilarity(reqTitle, book.title);
      
      // Calculate author similarity
      const authorSimilarity = calculateStringSimilarity(reqAuthor, book.author);
      
      // Calculate combined score (title is more important)
      const score = (titleSimilarity * 0.6) + (authorSimilarity * 0.4);
      
      // If score exceeds threshold and is better than current best, update best match
      if (score > threshold && score > bestScore) {
        bestMatch = book;
        bestScore = score;
      }
    }
    
    return bestMatch;
  }
  
  module.exports = {
    calculateStringSimilarity,
    findBestBookMatch
  };