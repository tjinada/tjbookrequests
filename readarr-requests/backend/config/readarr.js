// config/readarr.js - Updated with improved book and author matching
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

// Helper function to normalize author names for better matching
function normalizeAuthorName(name) {
  if (!name) return '';
  
  return name.toLowerCase()
    .replace(/\./g, '') // Remove periods
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Helper function to find the best author match with improved logic
function findBestAuthorMatch(authorResults, searchAuthorName) {
  if (!authorResults || authorResults.length === 0) {
    return null;
  }

  // Normalize search name for comparison
  const normalizedSearchName = normalizeAuthorName(searchAuthorName);
  
  // Create a scoring system for authors
  const scoredAuthors = authorResults.map(author => {
    const normalizedAuthorName = normalizeAuthorName(author.authorName);
    
    // Calculate base score - higher is better
    let score = 0;
    
    // Exact match gets highest score
    if (normalizedAuthorName === normalizedSearchName) {
      score += 100;
    }
    
    // Check for partial matches
    else if (normalizedAuthorName.includes(normalizedSearchName) || 
             normalizedSearchName.includes(normalizedAuthorName)) {
      score += 50;
    }
    
    // Check for name parts matching (first name, last name)
    const searchParts = normalizedSearchName.split(' ');
    const authorParts = normalizedAuthorName.split(' ');
    
    // If last names match, that's a good sign
    if (searchParts.length > 0 && authorParts.length > 0 &&
        searchParts[searchParts.length-1] === authorParts[authorParts.length-1]) {
      score += 40;
    }
    
    // If first names match or initials match
    if (searchParts.length > 0 && authorParts.length > 0) {
      const searchFirst = searchParts[0];
      const authorFirst = authorParts[0];
      
      if (searchFirst === authorFirst) {
        score += 30;
      }
      // Check for initials (H.G. vs Herbert George)
      else if (searchFirst.includes('.') && authorFirst[0] === searchFirst[0]) {
        score += 25;
      }
    }
    
    // Check for authors with many books - prefer these
    if (author.bookCount && author.bookCount > 10) {
      score += 15;
    }
    
    // Boost famous/established authors
    if (author.ratings && author.ratings.value && author.ratings.value > 4) {
      score += 10;
    }
    
    // If author has "biography" or similar words in genres or description, reduce score
    if (author.genres && Array.isArray(author.genres)) {
      const biographyWords = ['biography', 'biographer', 'criticism', 'critic', 'study'];
      if (author.genres.some(genre => 
          biographyWords.some(word => genre.toLowerCase().includes(word)))) {
        score -= 40;
      }
    }
    
    // If author's name appears in other contexts, it may be a biography writer
    if (author.authorName.toLowerCase().includes('biography') || 
        (author.overview && author.overview.toLowerCase().includes('biograph'))) {
      score -= 30;
    }
    
    return { author, score };
  });
  
  // Sort by score (highest first)
  scoredAuthors.sort((a, b) => b.score - a.score);
  
  // Log top 3 results for debugging
  log('Author matching results:');
  scoredAuthors.slice(0, 3).forEach(({ author, score }) => {
    log(`${author.authorName}: ${score}`);
  });
  
  // Return the best match
  return scoredAuthors.length > 0 ? scoredAuthors[0].author : null;
}

// Helper function to calculate title similarity
function titleSimilarity(title1, title2) {
  // Normalize titles
  const normalize = (title) => title.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize spaces
    .trim();
  
  const normTitle1 = normalize(title1);
  const normTitle2 = normalize(title2);
  
  // Exact match
  if (normTitle1 === normTitle2) {
    return 1.0;
  }
  
  // One title contains the other
  if (normTitle1.includes(normTitle2) || normTitle2.includes(normTitle1)) {
    // Calculate how much of the shorter title is contained in the longer one
    const shorterLength = Math.min(normTitle1.length, normTitle2.length);
    const longerLength = Math.max(normTitle1.length, normTitle2.length);
    return shorterLength / longerLength;
  }
  
  // Count matching words
  const words1 = normTitle1.split(' ');
  const words2 = normTitle2.split(' ');
  
  let matchingWords = 0;
  for (const word of words1) {
    if (words2.includes(word) && word.length > 2) { // Ignore short words
      matchingWords++;
    }
  }
  
  // Calculate Jaccard similarity
  const uniqueWords = new Set([...words1, ...words2]);
  return matchingWords / uniqueWords.size;
}

// Helper function to find the best book match with improved logic
function findBestBookMatch(books, searchTitle, searchAuthor) {
  if (!books || books.length === 0) return null;

  // Normalize search title and author for comparison
  const normSearchTitle = searchTitle.toLowerCase();
  const normSearchAuthor = searchAuthor ? searchAuthor.toLowerCase() : '';
  
  // Create a scoring system for books
  const scoredBooks = books.map(book => {
    const normBookTitle = book.title.toLowerCase();
    const bookAuthor = book.authorName || (book.author ? book.author : '');
    const normBookAuthor = bookAuthor.toLowerCase();
    
    // Calculate title similarity score
    const titleScore = titleSimilarity(normSearchTitle, normBookTitle) * 100;
    
    // Start with the title score
    let score = titleScore;
    
    // Penalize titles that look like biographies or studies about the original work
    const biographyWords = ['biography', 'life', 'lives', 'study', 'studies', 'criticism', 'critical'];
    if (biographyWords.some(word => normBookTitle.includes(word))) {
      // If the title contains the original title + biography words, it's likely about the book
      if (normBookTitle.includes(normSearchTitle)) {
        score -= 50;
        
        // Extra penalty if the searched author name appears in the title
        if (normSearchAuthor && normBookTitle.includes(normSearchAuthor)) {
          score -= 30;
        }
      }
    }
    
    // If a title has "the lives and liberties of" or similar phrases, it's likely a biography
    if (normBookTitle.includes('lives and') || 
        normBookTitle.includes('life and') || 
        normBookTitle.includes('biography of')) {
      score -= 70;
    }
    
    // If there's an author name to check
    if (normSearchAuthor && normBookAuthor) {
      // Matching author is a big boost
      if (normBookAuthor === normSearchAuthor) {
        score += 50;
      }
      else if (normBookAuthor.includes(normSearchAuthor) || normSearchAuthor.includes(normBookAuthor)) {
        score += 30;
      }
      
      // If the author name appears in the title, it might be a biography about the author
      if (normBookTitle.includes(normSearchAuthor)) {
        score -= 25;
      }
    }
    
    // Prefer older books (classics often have the more "original" title)
    if (book.releaseDate) {
      const year = new Date(book.releaseDate).getFullYear();
      // Books before 1950 get a boost, newer books get less
      if (year < 1950) {
        score += 20;
      } else if (year > 2000) {
        score -= 10;
      }
    }
    
    // Check if book title is exactly the search title
    if (normBookTitle === normSearchTitle) {
      score += 50;
    }
    
    // Check for Series information - typically original works aren't labeled as series
    if (book.seriesTitle) {
      score -= 10;
    }
    
    return { book, score };
  });
  
  // Sort by score (highest first)
  scoredBooks.sort((a, b) => b.score - a.score);
  
  // Log top 3 results for debugging
  log('Book matching results:');
  scoredBooks.slice(0, 3).forEach(({ book, score }) => {
    log(`${book.title} by ${book.authorName || 'Unknown'}: ${score}`);
  });
  
  // Return the best match
  return scoredBooks.length > 0 ? scoredBooks[0].book : null;
}

module.exports = {
  // Updated addBook function with improved author and book matching
  addBook: async (bookData) => {
    try {
      log(`Starting to add book: ${bookData.title} by ${bookData.author}`);

      // Step 1: Get profiles
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
      const rootFolderPath = rootFolders.data[0].path;

      log(`Using profiles - Quality: ${qualityProfileId}, Metadata: ${metadataProfileId}, Root: ${rootFolderPath}`);

      // Step 2: Check if the author exists using improved author matching
      let authorId;
      let isExistingAuthor = false;

      log(`Checking if author exists: ${bookData.author}`);
      const existingAuthorsResponse = await readarrAPI.get('/api/v1/author');

      if (existingAuthorsResponse.data?.length) {
        // Use the improved author matching function
        const existingAuthor = findBestAuthorMatch(existingAuthorsResponse.data, bookData.author);

        if (existingAuthor) {
          authorId = existingAuthor.id;
          isExistingAuthor = true;
          log(`Found existing author: ${existingAuthor.authorName} with ID: ${authorId}`);
        } else {
          log(`No matching author found among ${existingAuthorsResponse.data.length} existing authors`);
        }
      }

      // If author doesn't exist, create a new one using improved matching
      if (!authorId) {
        log(`Author not found in existing authors, looking up in Readarr's database`);
        const authorLookupResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(bookData.author)}`);

        if (!authorLookupResponse.data?.length) {
          throw new Error(`Author not found in Readarr lookup: ${bookData.author}`);
        }

        // Use the improved author matching instead of just taking the first result
        const bestAuthorMatch = findBestAuthorMatch(authorLookupResponse.data, bookData.author);
        
        if (!bestAuthorMatch) {
          throw new Error(`No suitable author match found for: ${bookData.author}`);
        }

        // Create author payload with the best match
        const authorPayload = {
          authorName: bestAuthorMatch.authorName,
          foreignAuthorId: bestAuthorMatch.foreignAuthorId,
          titleSlug: bestAuthorMatch.titleSlug,
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

        log(`Creating new author with payload: ${JSON.stringify(authorPayload)}`);

        const authorResponse = await readarrAPI.post('/api/v1/author', authorPayload);
        authorId = authorResponse.data.id;
        log(`Created new author with ID: ${authorId}`);

        // Wait a moment for Readarr to process the new author
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Step 3: Get all books for this author
      log(`Getting books for author ID: ${authorId}`);
      let booksList = [];

      try {
        const authorBooksResponse = await readarrAPI.get(`/api/v1/book?authorId=${authorId}&includeAllAuthorBooks=true`);
        booksList = authorBooksResponse.data || [];
        log(`Found ${booksList.length} books for author`);
      } catch (error) {
        log(`Error getting books for author: ${error.message}`);

        // If this is a new author, wait longer and retry
        if (!isExistingAuthor) {
          log(`Waiting longer for new author and retrying...`);
          await new Promise(resolve => setTimeout(resolve, 7000));

          try {
            const retryResponse = await readarrAPI.get(`/api/v1/book?authorId=${authorId}&includeAllAuthorBooks=true`);
            booksList = retryResponse.data || [];
            log(`Retry found ${booksList.length} books for author`);
          } catch (retryError) {
            log(`Retry also failed: ${retryError.message}`);
          }
        }
      }

      // Step 4: Find the requested book among the author's books using improved matching
      let targetBook = null;

      if (booksList.length > 0) {
        // Use improved book matching
        targetBook = findBestBookMatch(booksList, bookData.title, bookData.author);

        if (targetBook) {
          log(`Found matching book in author's library: "${targetBook.title}" with ID: ${targetBook.id}`);
        } else {
          log(`Requested book not found in author's current library, need to look it up`);
        }
      }

      // If book not found in existing library, we need to perform a book lookup with improved matching
      if (!targetBook) {
        log(`Looking up book in Readarr's database: ${bookData.title}`);

        // Search by title and author
        const searchTerm = `${bookData.title} ${bookData.author}`;
        const bookLookupResponse = await readarrAPI.get(`/api/v1/book/lookup?term=${encodeURIComponent(searchTerm)}`);

        if (!bookLookupResponse.data?.length) {
          throw new Error(`Book not found in Readarr lookup: ${bookData.title}`);
        }

        // Use improved book matching instead of just taking the first result
        const bestBookMatch = findBestBookMatch(bookLookupResponse.data, bookData.title, bookData.author);
        
        if (!bestBookMatch) {
          throw new Error(`No suitable book match found for: ${bookData.title}`);
        }

        log(`Selected best book match: "${bestBookMatch.title}" by ${bestBookMatch.authorName || 'Unknown'}`);

        // Add the book to the author's library
        const bookPayload = {
          authorId: authorId,
          foreignBookId: bestBookMatch.foreignBookId,
          title: bestBookMatch.title,
          qualityProfileId: qualityProfileId,
          metadataProfileId: metadataProfileId,
          rootFolderPath: rootFolderPath,
          monitored: true,
          addOptions: {
            searchForNewBook: false // We'll trigger search separately
          }
        };

        log(`Adding book with payload: ${JSON.stringify(bookPayload)}`);

        try {
          const addResponse = await readarrAPI.post('/api/v1/book', bookPayload);
          targetBook = addResponse.data;
          log(`Book added to library with ID: ${targetBook.id}`);

          // Give Readarr a moment to process
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (addError) {
          log(`Error adding book: ${addError.message}`);

          // If adding fails, try to get the book again - it might have been added automatically
          log(`Checking if book was added despite error...`);
          const checkBooksResponse = await readarrAPI.get(`/api/v1/book?authorId=${authorId}&includeAllAuthorBooks=true`);

          if (checkBooksResponse.data?.length) {
            targetBook = findBestBookMatch(checkBooksResponse.data, bookData.title, bookData.author);

            if (targetBook) {
              log(`Found book in library after all: "${targetBook.title}" with ID: ${targetBook.id}`);
            } else {
              throw new Error(`Failed to add book and couldn't find it in library: ${bookData.title}`);
            }
          } else {
            throw new Error(`Failed to add book and no books found in library: ${bookData.title}`);
          }
        }
      }

      // Make sure we have a target book at this point
      if (!targetBook) {
        throw new Error(`Could not find or add the requested book: ${bookData.title}`);
      }

      // Step 6: Trigger a search for the book
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
  },

  // Function to search for books with improved matching
  searchBook: async (title, author) => {
    try {
      log(`Searching for book: "${title}" by ${author}`);
      
      // Step 1: Search for author
      const authorLookupResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(author)}`);
      
      if (!authorLookupResponse.data?.length) {
        log(`Author not found: ${author}`);
        return { success: false, message: `Author not found: ${author}` };
      }
      
      // Step 2: Use improved author matching
      const bestAuthorMatch = findBestAuthorMatch(authorLookupResponse.data, author);
      
      if (!bestAuthorMatch) {
        log(`No suitable author match found for: ${author}`);
        return { success: false, message: `No suitable author match found for: ${author}` };
      }
      
      log(`Best author match: ${bestAuthorMatch.authorName}`);
      
      // Step 3: Search for the book
      const searchTerm = `${title} ${author}`;
      const bookLookupResponse = await readarrAPI.get(`/api/v1/book/lookup?term=${encodeURIComponent(searchTerm)}`);
      
      if (!bookLookupResponse.data?.length) {
        log(`No books found matching: ${searchTerm}`);
        return { success: false, message: `No books found matching: ${searchTerm}` };
      }
      
      // Step 4: Use improved book matching
      const bestBookMatch = findBestBookMatch(bookLookupResponse.data, title, author);
      
      if (!bestBookMatch) {
        log(`No suitable book match found for: ${title}`);
        return { success: false, message: `No suitable book match found for: ${title}` };
      }
      
      log(`Best book match: "${bestBookMatch.title}" by ${bestBookMatch.authorName || 'Unknown'}`);
      
      // Return success with the matched book and author
      return {
        success: true,
        book: bestBookMatch,
        author: bestAuthorMatch
      };
    } catch (error) {
      log(`Error searching for book: ${error.message}`);
      return { success: false, message: error.message };
    }
  },
  
  // Function to directly test the author matching
  testAuthorMatch: async (searchAuthorName) => {
    try {
      log(`Testing author matching for: ${searchAuthorName}`);
      
      const authorLookupResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(searchAuthorName)}`);
      
      if (!authorLookupResponse.data?.length) {
        return { success: false, message: `No authors found matching: ${searchAuthorName}` };
      }
      
      // Score all returned authors
      const authorResults = authorLookupResponse.data;
      const normalizedSearchName = normalizeAuthorName(searchAuthorName);
      
      // Create a scoring system for authors
      const scoredAuthors = authorResults.map(author => {
        const normalizedAuthorName = normalizeAuthorName(author.authorName);
        
        // Calculate base score - higher is better
        let score = 0;
        
        // Exact match gets highest score
        if (normalizedAuthorName === normalizedSearchName) {
          score += 100;
        }
        
        // Check for partial matches
        else if (normalizedAuthorName.includes(normalizedSearchName) || 
                normalizedSearchName.includes(normalizedAuthorName)) {
          score += 50;
        }
        
        // Check for name parts matching (first name, last name)
        const searchParts = normalizedSearchName.split(' ');
        const authorParts = normalizedAuthorName.split(' ');
        
        // If last names match, that's a good sign
        if (searchParts.length > 0 && authorParts.length > 0 &&
            searchParts[searchParts.length-1] === authorParts[authorParts.length-1]) {
          score += 40;
        }
        
        // If first names match or initials match
        if (searchParts.length > 0 && authorParts.length > 0) {
          const searchFirst = searchParts[0];
          const authorFirst = authorParts[0];
          
          if (searchFirst === authorFirst) {
            score += 30;
          }
          // Check for initials (H.G. vs Herbert George)
          else if (searchFirst.includes('.') && authorFirst[0] === searchFirst[0]) {
            score += 25;
          }
        }
        
        // Check for authors with many books - prefer these
        if (author.bookCount && author.bookCount > 10) {
          score += 15;
        }
        
        // Boost famous/established authors
        if (author.ratings && author.ratings.value && author.ratings.value > 4) {
          score += 10;
        }
        
        // If author has "biography" or similar words in genres or description, reduce score
        if (author.genres && Array.isArray(author.genres)) {
          const biographyWords = ['biography', 'biographer', 'criticism', 'critic', 'study'];
          if (author.genres.some(genre => 
              biographyWords.some(word => genre.toLowerCase().includes(word)))) {
            score -= 40;
          }
        }
        
        // If author's name appears in other contexts, it may be a biography writer
        if (author.authorName.toLowerCase().includes('biography') || 
            (author.overview && author.overview.toLowerCase().includes('biograph'))) {
          score -= 30;
        }
        
        return { author, score };
      });
      
      // Sort by score (highest first)
      scoredAuthors.sort((a, b) => b.score - a.score);
      
      // Return top 5 results with scores for analysis
      return {
        success: true,
        bestMatch: scoredAuthors[0]?.author,
        allMatches: scoredAuthors.map(({ author, score }) => ({
          authorName: author.authorName,
          score,
          id: author.id,
          foreignAuthorId: author.foreignAuthorId,
          bookCount: author.bookCount,
          genres: author.genres
        }))
      };
    } catch (error) {
      log(`Error testing author match: ${error.message}`);
      return { success: false, message: error.message };
    }
  },
  
  // Function to directly test the book matching
  testBookMatch: async (searchTitle, searchAuthor) => {
    try {
      log(`Testing book matching for: "${searchTitle}" by ${searchAuthor}`);
      
      // Search by title and author
      const searchTerm = `${searchTitle} ${searchAuthor}`;
      const bookLookupResponse = await readarrAPI.get(`/api/v1/book/lookup?term=${encodeURIComponent(searchTerm)}`);
      
      if (!bookLookupResponse.data?.length) {
        return { success: false, message: `No books found matching: ${searchTerm}` };
      }
      
      // Score all returned books
      const bookResults = bookLookupResponse.data;
      const normSearchTitle = searchTitle.toLowerCase();
      const normSearchAuthor = searchAuthor ? searchAuthor.toLowerCase() : '';
      
      // Create a scoring system for books
      const scoredBooks = bookResults.map(book => {
        const normBookTitle = book.title.toLowerCase();
        const bookAuthor = book.authorName || (book.author ? book.author : '');
        const normBookAuthor = bookAuthor.toLowerCase();
        
        // Calculate title similarity score
        const titleScore = titleSimilarity(normSearchTitle, normBookTitle) * 100;
        
        // Start with the title score
        let score = titleScore;
        
        // Penalize titles that look like biographies or studies about the original work
        const biographyWords = ['biography', 'life', 'lives', 'study', 'studies', 'criticism', 'critical'];
        if (biographyWords.some(word => normBookTitle.includes(word))) {
          // If the title contains the original title + biography words, it's likely about the book
          if (normBookTitle.includes(normSearchTitle)) {
            score -= 50;
            
            // Extra penalty if the searched author name appears in the title
            if (normSearchAuthor && normBookTitle.includes(normSearchAuthor)) {
              score -= 30;
            }
          }
        }
        
        // If a title has "the lives and liberties of" or similar phrases, it's likely a biography
        if (normBookTitle.includes('lives and') || 
            normBookTitle.includes('life and') || 
            normBookTitle.includes('biography of')) {
          score -= 70;
        }
        
        // If there's an author name to check
        if (normSearchAuthor && normBookAuthor) {
          // Matching author is a big boost
          if (normBookAuthor === normSearchAuthor) {
            score += 50;
          }
          else if (normBookAuthor.includes(normSearchAuthor) || normSearchAuthor.includes(normBookAuthor)) {
            score += 30;
          }
          
          // If the author name appears in the title, it might be a biography about the author
          if (normBookTitle.includes(normSearchAuthor)) {
            score -= 25;
          }
        }
        // Prefer older books (classics often have the more "original" title)
        if (book.releaseDate) {
          const year = new Date(book.releaseDate).getFullYear();
          // Books before 1950 get a boost, newer books get less
          if (year < 1950) {
            score += 20;
          } else if (year > 2000) {
            score -= 10;
          }
        }
        
        // Check if book title is exactly the search title
        if (normBookTitle === normSearchTitle) {
          score += 50;
        }
        
        // Check for Series information - typically original works aren't labeled as series
        if (book.seriesTitle) {
          score -= 10;
        }
        
        return { book, score };
      });
      
      // Sort by score (highest first)
      scoredBooks.sort((a, b) => b.score - a.score);
      
      // Return top 5 results with scores for analysis
      return {
        success: true,
        bestMatch: scoredBooks[0]?.book,
        allMatches: scoredBooks.map(({ book, score }) => ({
          title: book.title,
          author: book.authorName || 'Unknown',
          score,
          id: book.id,
          foreignBookId: book.foreignBookId,
          releaseDate: book.releaseDate
        }))
      };
    } catch (error) {
      log(`Error testing book match: ${error.message}`);
      return { success: false, message: error.message };
    }
  }
};