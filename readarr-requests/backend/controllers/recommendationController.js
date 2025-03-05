// controllers/recommendationController.js
const Request = require('../models/Request');
const googleBooksAPI = require('../config/googleBooks');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/recommendations.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

// Create axios instance for Google Books API
const googleBooksAxios = axios.create({
  baseURL: 'https://www.googleapis.com/books/v1',
  timeout: 10000,
  params: {
    key: process.env.GOOGLE_BOOKS_API_KEY
  }
});

// Process Google Books data to match our format
const processGoogleBook = (book) => {
  if (!book.volumeInfo) return null;

  const info = book.volumeInfo;
  
  // Extract primary ISBN
  let isbn = null;
  if (info.industryIdentifiers && info.industryIdentifiers.length > 0) {
    // Prefer ISBN_13, fallback to ISBN_10
    const isbn13 = info.industryIdentifiers.find(id => id.type === 'ISBN_13');
    const isbn10 = info.industryIdentifiers.find(id => id.type === 'ISBN_10');
    isbn = isbn13 ? isbn13.identifier : (isbn10 ? isbn10.identifier : null);
  }
  
  // Extract best available image
  let coverImage = null;
  if (info.imageLinks) {
    // Try to get the best available image in this order
    coverImage = info.imageLinks.extraLarge || 
                info.imageLinks.large || 
                info.imageLinks.medium || 
                info.imageLinks.small || 
                info.imageLinks.thumbnail;
  }
  
  return {
    id: `gb-${book.id}`,
    title: info.title || 'Unknown Title',
    author: info.authors ? info.authors.join(', ') : 'Unknown Author',
    overview: info.description || '',
    cover: coverImage,
    releaseDate: info.publishedDate,
    year: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : null,
    rating: info.averageRating || 0,
    ratings_count: info.ratingsCount || 0,
    source: 'google',
    genres: info.categories || [],
    isbn: isbn,
    pageCount: info.pageCount || 0,
    publisher: info.publisher || '',
    language: info.language || 'en',
    googleId: book.id
  };
};

/**
 * Get personalized book recommendations based on user's request history
 */
exports.getRecommendations = async (req, res) => {
  try {
    // Get user's requests
    const userRequests = await Request.find({ user: req.user.id });
    
    if (!userRequests || userRequests.length === 0) {
      log(`No requests found for user ${req.user.id}`);
      return res.json([]);
    }
    
    log(`Found ${userRequests.length} requests for user ${req.user.id}`);
    
    // Extract authors and potential genres from requests
    const authors = new Set();
    const titles = new Set();
    const requestedBookIds = new Set();
    
    // Collect data from user's requests
    userRequests.forEach(request => {
      if (request.author) authors.add(request.author.trim());
      if (request.title) titles.add(request.title.trim());
      if (request.bookId) {
        requestedBookIds.add(request.bookId);
        // Also add without prefix if it has one
        if (request.bookId.startsWith('gb-')) {
          requestedBookIds.add(request.bookId.substring(3));
        }
      }
    });
    
    // Get more details about requested books to extract genres
    const genres = new Set();
    const seriesTitles = new Set();
    
    // Try to get detailed info for books requested with Google Books source
    const googleBooksRequests = userRequests.filter(req => 
      req.source === 'google' && req.bookId
    );
    
    // If we have Google Books requests, get details to extract genres
    if (googleBooksRequests.length > 0) {
      for (const request of googleBooksRequests) {
        try {
          const bookId = request.bookId.startsWith('gb-') 
            ? request.bookId.substring(3) 
            : request.bookId;
            
          const bookResponse = await googleBooksAxios.get(`/volumes/${bookId}`);
          
          if (bookResponse.data && bookResponse.data.volumeInfo) {
            const info = bookResponse.data.volumeInfo;
            
            // Extract genres/categories
            if (info.categories && Array.isArray(info.categories)) {
              info.categories.forEach(category => genres.add(category));
            }
            
            // Try to identify if it's part of a series
            if (info.title) {
              // Look for series indicators in title
              const seriesIndicators = [': Book ', ' - Book ', '(Book ', 'Series: ', 'Series - '];
              
              for (const indicator of seriesIndicators) {
                if (info.title.includes(indicator)) {
                  // Try to extract series title
                  const seriesTitle = info.title.split(indicator)[0].trim();
                  if (seriesTitle) {
                    seriesTitles.add(seriesTitle);
                    // Also try more generic series name (remove "The" etc.)
                    if (seriesTitle.startsWith('The ')) {
                      seriesTitles.add(seriesTitle.substring(4));
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          log(`Error getting book details for ID ${request.bookId}: ${error.message}`);
          // Continue with next book
        }
      }
    }
    
    log(`Extracted data: ${authors.size} authors, ${genres.size} genres, ${seriesTitles.size} series`);
    
    // Build recommendations based on the collected data
    let allRecommendations = [];
    
    // 1. First try to get books from the same series
    if (seriesTitles.size > 0) {
      for (const seriesTitle of seriesTitles) {
        try {
          log(`Searching for books in series: ${seriesTitle}`);
          const seriesResponse = await googleBooksAxios.get('/volumes', {
            params: {
              q: `"${seriesTitle}" intitle:${seriesTitle}`,
              maxResults: 10,
              orderBy: 'relevance',
              printType: 'books'
            }
          });
          
          if (seriesResponse.data && seriesResponse.data.items) {
            const seriesBooks = seriesResponse.data.items
              .map(processGoogleBook)
              .filter(book => book && !requestedBookIds.has(book.id) && !requestedBookIds.has(book.id.substring(3)));
              
            allRecommendations = [...allRecommendations, ...seriesBooks];
            
            log(`Found ${seriesBooks.length} potential series books for "${seriesTitle}"`);
          }
        } catch (error) {
          log(`Error searching for series books: ${error.message}`);
          // Continue with next series
        }
      }
    }
    
    // 2. Try to get books by the same authors
    if (authors.size > 0) {
      const authorsList = Array.from(authors);
      // Limit to 3 authors to avoid too many requests
      const recentAuthors = authorsList.slice(0, 3);
      
      for (const author of recentAuthors) {
        try {
          log(`Searching for books by author: ${author}`);
          const authorResponse = await googleBooksAxios.get('/volumes', {
            params: {
              q: `inauthor:"${author}"`,
              maxResults: 15,
              orderBy: 'relevance',
              printType: 'books'
            }
          });
          
          if (authorResponse.data && authorResponse.data.items) {
            const authorBooks = authorResponse.data.items
              .map(processGoogleBook)
              .filter(book => book && !requestedBookIds.has(book.id) && !requestedBookIds.has(book.id.substring(3)));
              
            allRecommendations = [...allRecommendations, ...authorBooks];
            
            log(`Found ${authorBooks.length} books by author "${author}"`);
          }
        } catch (error) {
          log(`Error searching for author books: ${error.message}`);
          // Continue with next author
        }
      }
    }
    
    // 3. Try to get books in the same genres
    if (genres.size > 0) {
      const genresList = Array.from(genres);
      // Limit to 3 genres to avoid too many requests
      const topGenres = genresList.slice(0, 3);
      
      for (const genre of topGenres) {
        try {
          log(`Searching for books in genre: ${genre}`);
          const genreResponse = await googleBooksAxios.get('/volumes', {
            params: {
              q: `subject:"${genre}"`,
              maxResults: 10,
              orderBy: 'relevance',
              printType: 'books'
            }
          });
          
          if (genreResponse.data && genreResponse.data.items) {
            const genreBooks = genreResponse.data.items
              .map(processGoogleBook)
              .filter(book => book && !requestedBookIds.has(book.id) && !requestedBookIds.has(book.id.substring(3)));
              
            allRecommendations = [...allRecommendations, ...genreBooks];
            
            log(`Found ${genreBooks.length} books in genre "${genre}"`);
          }
        } catch (error) {
          log(`Error searching for genre books: ${error.message}`);
          // Continue with next genre
        }
      }
    }
    
    // 4. Deduplicate recommendations
    const seenIds = new Set();
    const uniqueRecommendations = [];
    
    allRecommendations.forEach(book => {
      const bookId = book.id.startsWith('gb-') ? book.id : `gb-${book.id}`;
      if (!seenIds.has(bookId)) {
        seenIds.add(bookId);
        uniqueRecommendations.push(book);
      }
    });
    
    // 5. Sort recommendations by relevance
    // First by books in the same series, then by the same author, then by rating
    uniqueRecommendations.sort((a, b) => {
      // Check if book is in a series
      const aInSeries = Array.from(seriesTitles).some(series => 
        a.title && a.title.includes(series)
      );
      
      const bInSeries = Array.from(seriesTitles).some(series => 
        b.title && b.title.includes(series)
      );
      
      // Books in series get top priority
      if (aInSeries && !bInSeries) return -1;
      if (!aInSeries && bInSeries) return 1;
      
      // Then check if by same author
      const aByKnownAuthor = Array.from(authors).some(author => 
        a.author && a.author.toLowerCase().includes(author.toLowerCase())
      );
      
      const bByKnownAuthor = Array.from(authors).some(author => 
        b.author && b.author.toLowerCase().includes(author.toLowerCase())
      );
      
      // Books by known authors get priority
      if (aByKnownAuthor && !bByKnownAuthor) return -1;
      if (!aByKnownAuthor && bByKnownAuthor) return 1;
      
      // Then sort by rating
      return (b.rating || 0) - (a.rating || 0);
    });
    
    // 6. Limit to reasonable number of recommendations
    const finalRecommendations = uniqueRecommendations.slice(0, 20);
    
    log(`Returning ${finalRecommendations.length} recommendations`);
    
    return res.json(finalRecommendations);
  } catch (error) {
    log(`Error generating recommendations: ${error.message}`);
    res.status(500).json({ 
      message: 'Error generating recommendations',
      error: error.message
    });
  }
};