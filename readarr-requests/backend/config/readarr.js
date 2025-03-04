// config/readarr.js - Enhanced with improved matching
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
      // If it's a biography, extract the actual author
      else if (result.author.toLowerCase() !== potentialAuthor.toLowerCase()) {
        const currentTitle = result.title;
        const currentAuthor = result.author;
        
        // This could be a biography like "H.G. Wells by W. Warren Wagar"
        // In this case, W. Warren Wagar is the actual author
        log(`Possible biography detected. Title: "${result.title}", Listed author: "${result.author}"`);
        log(`Checking if "${potentialAuthor}" should be the actual author...`);
        
        // Only update if we suspect this is a biography format
        // Look for biography indicators in the title
        const biographyIndicators = ['biography', 'life', 'lives', 'study of'];
        const isBiography = biographyIndicators.some(indicator => 
          currentTitle.toLowerCase().includes(indicator));
        
        // If it seems to be a biography, update the author
        if (isBiography || currentTitle.split(' ').length <= 4) { // Short titles like "H.G. Wells" are likely subjects
          result.author = potentialAuthor;
          log(`Detected biography format. Updated author from "${currentAuthor}" to "${result.author}"`);
        }
      }
    }
  }
  
  return result;
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,        // deletion
        matrix[i][j - 1] + 1,        // insertion
        matrix[i - 1][j - 1] + cost  // substitution
      );
    }
  }

  return matrix[len1][len2];
}

// Calculate similarity between two strings (0-1)
function stringSimilarity(str1, str2) {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength ? (maxLength - distance) / maxLength : 1;
}

// Extract core title without series information in parentheses
function extractCoreTitle(title) {
  if (!title) return '';
  // First try to remove anything after colon or parentheses
  return title.split(/[:(]/)[0].trim();
}

// Improved author matching function
function findBestAuthorMatch(authorResults, searchAuthorName) {
  if (!authorResults || authorResults.length === 0) {
    return null;
  }

  log(`\n==== Author Matching for "${searchAuthorName}" ====`);
  
  // Normalize search name for comparison
  const normalizedSearchName = normalizeText(searchAuthorName);
  const searchNameParts = normalizedSearchName.split(' ').filter(part => part.length > 1);
  
  // Create a scoring system for authors
  const scoredAuthors = authorResults.map(author => {
    const normalizedAuthorName = normalizeText(author.authorName);
    const authorNameParts = normalizedAuthorName.split(' ').filter(part => part.length > 1);
    
    // Calculate base score - higher is better
    let score = 0;
    let matchReasons = [];
    
    // Calculate name similarity using Levenshtein
    const similarity = stringSimilarity(normalizedSearchName, normalizedAuthorName);
    const similarityScore = Math.round(similarity * 100);
    score += similarityScore;
    matchReasons.push(`Name similarity: ${similarityScore}`);
    
    // Exact name match is a huge boost
    if (normalizedSearchName === normalizedAuthorName) {
      score += 300;  // Increased from 200
      matchReasons.push('Exact name match: +300');
    }
    
    // Check for all name parts matching (more strict than partial matches)
    const allPartsMatch = searchNameParts.length > 0 && 
        searchNameParts.every(part => authorNameParts.includes(part));
        
    if (allPartsMatch && searchNameParts.length > 1) {
      score += 150;  // Increased from 100
      matchReasons.push('All name parts match: +150');
    }
    
    // Last name match is very important
    if (searchNameParts.length > 0 && authorNameParts.length > 0 &&
        searchNameParts[searchNameParts.length-1] === authorNameParts[authorNameParts.length-1]) {
      score += 120;  // Increased from 80
      matchReasons.push('Last name match: +120');
    }
    
    // First name match is also important
    if (searchNameParts.length > 0 && authorNameParts.length > 0 &&
        searchNameParts[0] === authorNameParts[0]) {
      score += 80;
      matchReasons.push('First name match: +80');
    }
    
    // Multi-part name matching - count how many parts match exactly
    const matchingPartCount = searchNameParts.filter(part => 
      authorNameParts.includes(part)).length;
    
    const totalParts = Math.max(searchNameParts.length, authorNameParts.length);
    const partMatchRatio = totalParts > 0 ? matchingPartCount / totalParts : 0;
    
    if (partMatchRatio > 0) {
      const partMatchScore = Math.round(partMatchRatio * 120);  // Increased from 100
      score += partMatchScore;
      matchReasons.push(`Name part match ratio (${matchingPartCount}/${totalParts}): +${partMatchScore}`);
    }
    
    // Authors with many books should rank higher
    if (author.bookCount) {
      const bookBonus = Math.min(30, author.bookCount * 2);
      score += bookBonus;
      matchReasons.push(`Book count (${author.bookCount}): +${bookBonus}`);
    }
    
    // Established authors with ratings should rank higher
    if (author.ratings && author.ratings.value) {
      const ratingBonus = Math.round(author.ratings.value * 5);
      score += ratingBonus;
      matchReasons.push(`Rating bonus (${author.ratings.value}): +${ratingBonus}`);
    }
    
    // Check for biography markers in overview or genres
    const biographyRelatedWords = [
      'biography', 'biographer', 'biographic',
      'critic', 'criticism', 'critical',
      'studies', 'study of', 'analysis', 'commentator',
      'historian', 'introduction by', 'afterword by'
    ];
    
    // Check overview for biography-related terms
    if (author.overview) {
      const overview = author.overview.toLowerCase();
      const hasBiographyTerms = biographyRelatedWords.some(term => overview.includes(term));
      
      if (hasBiographyTerms) {
        score -= 100;
        matchReasons.push('Biography terms in overview: -100');
      }
    }
    
    // Check genres for biography identifiers
    if (author.genres && Array.isArray(author.genres)) {
      const hasBiographyGenre = author.genres.some(genre => 
        biographyRelatedWords.some(term => genre.toLowerCase().includes(term)));
      
      if (hasBiographyGenre) {
        score -= 150;
        matchReasons.push('Biography genre: -150');
      }
    }
    
    // First name only isn't enough for a strong match
    if (matchingPartCount === 1 && searchNameParts.length > 1 && 
        searchNameParts[0] === authorNameParts[0] && 
        searchNameParts[searchNameParts.length-1] !== authorNameParts[authorNameParts.length-1]) {
      score -= 150;  // Increased from 70
      matchReasons.push('First name only match: -150');
    }
    
    // If name similarity is very low, it's likely not a good match
    if (similarity < 0.3) {
      score -= 250;  // Increased from 200
      matchReasons.push('Very low name similarity: -250');
    }
    
    // If the author looks like a completely different name, heavily penalize
    if (similarity < 0.5 && !allPartsMatch && matchingPartCount === 0) {
      score -= 500;
      matchReasons.push('No matching name parts and low similarity: -500');
    }
    
    return { author, score, reasons: matchReasons, similarity };
  });
  
  // Sort by score (highest first)
  scoredAuthors.sort((a, b) => b.score - a.score);
  
  // Log scores for debugging
  scoredAuthors.forEach(({ author, score, reasons, similarity }, index) => {
    if (index < 5) { // Only log top 5 for brevity
      log(`[${index + 1}] ${author.authorName} (Score: ${score}, Similarity: ${(similarity * 100).toFixed(1)}%)`);
      reasons.forEach(reason => log(`    - ${reason}`));
    }
  });
  
  // The match must exceed a minimum threshold
  const bestMatch = scoredAuthors[0];
  if (!bestMatch || bestMatch.score < 70) {  // Increased from 50
    log(`Best author match "${bestMatch?.author.authorName}" with score ${bestMatch?.score} is below minimum threshold`);
    return null;
  }
  
  // Ensure the top match is significantly better than the second best
  if (scoredAuthors.length > 1) {
    const difference = bestMatch.score - scoredAuthors[1].score;
    if (difference < 40) {  // Increased from 20
      log(`Warning: Top match "${bestMatch.author.authorName}" (${bestMatch.score}) is close to second best "${scoredAuthors[1].author.authorName}" (${scoredAuthors[1].score})`);
    }
  }
  
  log(`Selected author match: ${bestMatch ? bestMatch.author.authorName : 'None'} with score ${bestMatch ? bestMatch.score : 0}`);
  
  // Return the best match if it's above threshold
  return bestMatch?.author;
}

// Improved book matching function
function findBestBookMatch(books, searchTitle, searchAuthor) {
  if (!books || books.length === 0) return null;

  log(`\n==== Book Matching for "${searchTitle}" by "${searchAuthor}" ====`);
  
  // Normalize search data
  const normSearchTitle = searchTitle ? searchTitle.toLowerCase() : '';
  const normSearchAuthor = searchAuthor ? searchAuthor.toLowerCase() : '';
  
  // Extract core title without series information in parentheses
  const coreSearchTitle = extractCoreTitle(normSearchTitle);
  
  // Create a scoring system for books
  const scoredBooks = books.map(book => {
    const normBookTitle = book.title ? book.title.toLowerCase() : '';
    const coreBookTitle = extractCoreTitle(normBookTitle);
    const bookAuthor = book.authorName || book.author || '';
    const normBookAuthor = bookAuthor.toLowerCase();
    
    // Calculate full title similarity
    const fullTitleSim = calculateTitleSimilarity(normSearchTitle, normBookTitle);
    // Calculate core title similarity
    const coreTitleSim = calculateTitleSimilarity(coreSearchTitle, coreBookTitle);
    
    // Use the best similarity score
    const titleSim = Math.max(fullTitleSim, coreTitleSim);
    const titleSimScore = Math.round(titleSim * 150);
    
    // Start with the title similarity score
    let score = titleSimScore;
    let matchReasons = [];
    matchReasons.push(`Title similarity (${(titleSim * 100).toFixed(1)}%): ${titleSimScore}`);
    
    // Exact title match is a huge boost
    if (normSearchTitle === normBookTitle) {
      score += 200;  // Increased from 100
      matchReasons.push('Exact title match: +200');
    } 
    // Exact core title match is also a significant boost
    else if (coreSearchTitle === coreBookTitle && coreSearchTitle.length > 3) {
      score += 150;
      matchReasons.push('Exact core title match: +150');
    }
    
    // Severe penalty for very low title similarity
    if (titleSim < 0.25) {
      score -= 350;  // Increased from 300
      matchReasons.push('Very low title similarity: -350');
    }
    
    // Detect biographies or critical works about the original
    const biographyWords = [
      'biography', 'life of', 'lives of', 'living', 'study of', 
      'studies', 'criticism', 'critical', 'guide to', 'companion'
    ];
    
    // Check if this is a biography of the search author
    const isBiographyOfSearchAuthor = biographyWords.some(word => 
      normBookTitle.includes(word)) && normBookTitle.includes(normSearchAuthor);
      
    if (isBiographyOfSearchAuthor) {
      score -= 300;
      matchReasons.push('Biography of search author: -300');
    }
    
    // Check for title containing biography phrases
    const hasBiographyPhrase = biographyWords.some(word => normBookTitle.includes(word));
    if (hasBiographyPhrase) {
      score -= 150;
      matchReasons.push('Contains biography phrase: -150');
    }
    
    // If the author name appears in the title, it might be a biography
    if (normSearchAuthor && normBookTitle.includes(normSearchAuthor)) {
      score -= 100;
      matchReasons.push('Author name in title: -100');
    }
    
    // Check for the classic "X by Y" biography format
    if (normBookTitle.includes(' by ') && !normBookTitle.startsWith('by ')) {
      const titleParts = normBookTitle.split(' by ');
      // If what comes before "by" matches search author, this is likely a biography
      if (titleParts[0].includes(normSearchAuthor)) {
        score -= 200;
        matchReasons.push('Title has "Author by Biographer" format: -200');
      }
    }
    
    // Author matching gives a boost
    if (normSearchAuthor && normBookAuthor) {
      const authorSim = stringSimilarity(normSearchAuthor, normBookAuthor);
      const authorSimScore = Math.round(authorSim * 120);  // Increased from 100
      score += authorSimScore;
      matchReasons.push(`Author similarity (${(authorSim * 100).toFixed(1)}%): +${authorSimScore}`);
      
      // Exact author match is a significant boost
      if (normSearchAuthor === normBookAuthor) {
        score += 150;  // Increased from 75
        matchReasons.push('Exact author match: +150');
      }
    }
    
    // Publication date bonus for originals vs modern works
    if (book.releaseDate) {
      try {
        const year = new Date(book.releaseDate).getFullYear();
        if (year < 1940) {
          // Classic works get a big boost
          score += 50;
          matchReasons.push(`Classic work (${year}): +50`);
        } else if (year < 1980) {
          // Older works get a moderate boost
          score += 25;
          matchReasons.push(`Older work (${year}): +25`);
        } else if (year > 2010) {
          // Very recent works might be about the original
          score -= 15;
          matchReasons.push(`Recent work (${year}): -15`);
        }
      } catch (e) {
        // Ignore date parsing errors
      }
    }
    
    // Original works tend to have shorter, more iconic titles
    if (coreBookTitle.split(' ').length <= 3 && coreSearchTitle.split(' ').length <= 3 && 
        titleSim >= 0.5) {
      score += 40;  // Increased from 20
      matchReasons.push('Matching short, iconic title: +40');
    }
    
    // Heavily penalize series books when looking for classics
    if (book.seriesTitle && normSearchTitle.split(' ').length <= 3) {
      score -= 40;
      matchReasons.push('Series book vs. classic title: -40');
    }
    
    // Add a small bonus for popularity/ratings
    if (book.ratings && book.ratings.value) {
      const ratingBonus = Math.min(20, Math.round(book.ratings.value * 4));
      score += ratingBonus;
      matchReasons.push(`Rating bonus (${book.ratings.value}): +${ratingBonus}`);
    }
    
    return { book, score, reasons: matchReasons, titleSimilarity: titleSim };
  });
  
  // Sort by score (highest first)
  scoredBooks.sort((a, b) => b.score - a.score);
  
  // Log scores for debugging
  scoredBooks.forEach(({ book, score, reasons, titleSimilarity }, index) => {
    if (index < 5) { // Only log top 5 for brevity
      log(`[${index + 1}] "${book.title}" by ${book.authorName || book.author || 'Unknown'} (Score: ${score}, Title Sim: ${(titleSimilarity * 100).toFixed(1)}%)`);
      reasons.forEach(reason => log(`    - ${reason}`));
    }
  });
  
  // The match must exceed a minimum threshold
  const bestMatch = scoredBooks[0];
  if (!bestMatch || bestMatch.score < 70) {  // Increased from 50
    log(`Best book match "${bestMatch?.book.title}" with score ${bestMatch?.score} is below minimum threshold`);
    return null;
  }
  
  // Title similarity must be reasonable
  if (bestMatch.titleSimilarity < 0.3) {  // Decreased from 0.35 to allow more flexibility
    log(`Best book match "${bestMatch.book.title}" has too low title similarity (${(bestMatch.titleSimilarity * 100).toFixed(1)}%)`);
    return null;
  }
  
  // Ensure the top match is significantly better than the second best
  if (scoredBooks.length > 1) {
    const difference = bestMatch.score - scoredBooks[1].score;
    if (difference < 40) {  // Increased from 30
      log(`Warning: Top match "${bestMatch.book.title}" (${bestMatch.score}) is close to second best "${scoredBooks[1].book.title}" (${scoredBooks[1].score})`);
    }
  }
  
  log(`Selected book match: ${bestMatch ? bestMatch.book.title : 'None'} with score ${bestMatch ? bestMatch.score : 0}`);
  
  // Return the best match if it passes thresholds
  return bestMatch?.book;
}

// Calculate title similarity between two books
function calculateTitleSimilarity(title1, title2) {
  if (!title1 || !title2) return 0;
  
  // Normalize titles
  const normalize = (title) => title.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize spaces
    .trim();
  
  const normTitle1 = normalize(title1);
  const normTitle2 = normalize(title2);
  
  // Calculate string similarity
  const similarity = stringSimilarity(normTitle1, normTitle2);
  
  // Also check for one title containing the other
  let containmentScore = 0;
  if (normTitle1.includes(normTitle2) || normTitle2.includes(normTitle1)) {
    // Calculate how much of the shorter title is contained in the longer one
    const shorterLength = Math.min(normTitle1.length, normTitle2.length);
    const longerLength = Math.max(normTitle1.length, normTitle2.length);
    containmentScore = shorterLength / longerLength;
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
  
  // Calculate word match ratio
  const totalUniqueWords = new Set([...words1, ...words2]).size;
  const wordMatchRatio = totalUniqueWords > 0 ? matchingWords / totalUniqueWords : 0;
  
  // Return the best of the similarity measures
  return Math.max(similarity, containmentScore, wordMatchRatio);
}

module.exports = {
  // Updated addBook function with improved author and book matching
  addBook: async (bookData) => {
    try {
      log(`\n========== Starting to add book ==========`);
      log(`Original request: "${bookData.title}" by ${bookData.author}`);
      
      // Preprocess the input to handle ambiguous formats
      const processedData = preprocessBookData(bookData);
      log(`Processed request: "${processedData.title}" by ${processedData.author}`);
      
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

      // STEP 2: FIRST SEARCH FOR EXACT TITLE+AUTHOR MATCH TO BYPASS THE AUTHOR MATCHING
      log(`Searching for exact book match: "${processedData.title}" by ${processedData.author}`);
      
      const exactBookSearchTerm = `"${processedData.title}" ${processedData.author}`;
      let exactBookResponse;
      try {
        exactBookResponse = await readarrAPI.get(`/api/v1/book/lookup?term=${encodeURIComponent(exactBookSearchTerm)}`);
      } catch (error) {
        log(`Exact book search failed: ${error.message}`);
        // Continue with normal flow if exact search fails
      }
      
      // If we found exact matches, choose the best one
      if (exactBookResponse && exactBookResponse.data?.length > 0) {
        log(`Found ${exactBookResponse.data.length} results from exact search`);
        
        // Use improved book matching to find the best match
        const exactBookMatch = findBestBookMatch(exactBookResponse.data, processedData.title, processedData.author);
        
        if (exactBookMatch && exactBookMatch.foreignBookId) {
          log(`Found exact book match: "${exactBookMatch.title}" by ${exactBookMatch.authorName || 'Unknown author'}`);
          
          // Now we need to get or create the author
          let authorId;
          
          // Check if author already exists in library
          log(`Checking if author exists: ${exactBookMatch.authorName}`);
          const existingAuthorsResponse = await readarrAPI.get('/api/v1/author');
          
          if (existingAuthorsResponse.data?.length) {
            // Look for exact author match first
            const exactAuthorMatch = existingAuthorsResponse.data.find(a => 
              normalizeText(a.authorName) === normalizeText(exactBookMatch.authorName));
              
            if (exactAuthorMatch) {
              authorId = exactAuthorMatch.id;
              log(`Found existing author with exact name match: ${exactAuthorMatch.authorName} (ID: ${authorId})`);
            } else {
              // Use the improved author matching function
              const bestAuthorMatch = findBestAuthorMatch(existingAuthorsResponse.data, exactBookMatch.authorName);
              
              if (bestAuthorMatch) {
                authorId = bestAuthorMatch.id;
                log(`Found existing author: ${bestAuthorMatch.authorName} with ID: ${authorId}`);
              }
            }
          }
          
          // If author doesn't exist, create the author
          if (!authorId) {
            log(`Creating new author: ${exactBookMatch.authorName}`);
            
            // Create author payload
            const authorPayload = {
              authorName: exactBookMatch.authorName,
              foreignAuthorId: exactBookMatch.authorId || exactBookMatch.foreignAuthorId,
              titleSlug: exactBookMatch.authorTitleSlug || exactBookMatch.titleSlug,
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
            
            // Wait for Readarr to process the new author
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          // Now add the book to the author
          log(`Adding book "${exactBookMatch.title}" to author ID: ${authorId}`);
          
          const bookPayload = {
            authorId: authorId,
            foreignBookId: exactBookMatch.foreignBookId,
            title: exactBookMatch.title,
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
            const targetBook = addResponse.data;
            log(`Book added to library with ID: ${targetBook.id}`);
            
            // Trigger a search for the book
            log(`Triggering search for book ID: ${targetBook.id}`);
            const searchPayload = {
              name: "BookSearch",
              bookIds: [targetBook.id]
            };
            
            const searchResponse = await readarrAPI.post('/api/v1/command', searchPayload);
            log(`Search command successful: Command ID: ${searchResponse.data.id}, Status: ${searchResponse.data.status}`);
            
            // Return the book with search information
            return {
              ...targetBook,
              searchCommandId: searchResponse.data.id,
              searchStatus: searchResponse.data.status
            };
          } catch (addError) {
            log(`Error adding book: ${addError.message}, will continue with regular flow`);
            // Continue with normal flow if adding fails
          }
        }
      }

      // FALL BACK TO REGULAR APPROACH IF EXACT MATCH FAILS
      
      // Step 3: Check if the author exists using robust author matching
      let authorId;
      let isExistingAuthor = false;

      log(`Checking if author exists: ${processedData.author}`);
      const existingAuthorsResponse = await readarrAPI.get('/api/v1/author');

      if (existingAuthorsResponse.data?.length) {
        // Look for exact author match first
        const exactAuthorMatch = existingAuthorsResponse.data.find(a => 
          normalizeText(a.authorName) === normalizeText(processedData.author));
          
        if (exactAuthorMatch) {
          authorId = exactAuthorMatch.id;
          isExistingAuthor = true;
          log(`Found existing author with exact name match: ${exactAuthorMatch.authorName} (ID: ${authorId})`);
        } else {
          // Use the improved author matching function
          const bestAuthorMatch = findBestAuthorMatch(existingAuthorsResponse.data, processedData.author);
          
          if (bestAuthorMatch) {
            authorId = bestAuthorMatch.id;
            isExistingAuthor = true;
            log(`Found existing author: ${bestAuthorMatch.authorName} with ID: ${authorId}`);
          } else {
            log(`No matching author found among ${existingAuthorsResponse.data.length} existing authors`);
          }
        }
      }

      // If author doesn't exist, create a new one using robust matching
      if (!authorId) {
        log(`Author not found in existing authors, looking up in Readarr's database`);
        
        // Use a more specific search term for the author
        const authorSearchTerm = `"${processedData.author}"`;
        const authorLookupResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(authorSearchTerm)}`);

        if (!authorLookupResponse.data?.length) {
          // Try without quotes if specific search fails
          const fallbackAuthorResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(processedData.author)}`);
          
          if (!fallbackAuthorResponse.data?.length) {
            throw new Error(`Author not found in Readarr lookup: ${processedData.author}`);
          }
          
          // Use the improved author matching 
          const bestAuthorMatch = findBestAuthorMatch(fallbackAuthorResponse.data, processedData.author);
          
          if (!bestAuthorMatch) {
            throw new Error(`No suitable author match found for: ${processedData.author}`);
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

          // Wait for Readarr to process the new author
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          // Use the first exact match if available
          const exactAuthorMatch = authorLookupResponse.data.find(a =>
            normalizeText(a.authorName) === normalizeText(processedData.author));
            
          if (exactAuthorMatch) {
            log(`Found exact author match: ${exactAuthorMatch.authorName}`);
            
            // Create author payload with exact match
            const authorPayload = {
              authorName: exactAuthorMatch.authorName,
              foreignAuthorId: exactAuthorMatch.foreignAuthorId,
              titleSlug: exactAuthorMatch.titleSlug,
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
    
            // Wait for Readarr to process the new author
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            // Use the improved author matching 
            const bestAuthorMatch = findBestAuthorMatch(authorLookupResponse.data, processedData.author);
            
            if (!bestAuthorMatch) {
              throw new Error(`No suitable author match found for: ${processedData.author}`);
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
    
            // Wait for Readarr to process the new author
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }

      // Step 4: Get all books for this author
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

      // Step 5: Find the requested book among the author's books using robust matching
      let targetBook = null;

      if (booksList.length > 0) {
        // First check for exact title match
        const exactTitleMatch = booksList.find(book => 
          normalizeText(book.title) === normalizeText(processedData.title));
          
        if (exactTitleMatch) {
          targetBook = exactTitleMatch;
          log(`Found exact title match in author's library: "${targetBook.title}" with ID: ${targetBook.id}`);
        } else {
          // Use improved book matching
          targetBook = findBestBookMatch(booksList, processedData.title, processedData.author);

          if (targetBook) {
            log(`Found matching book in author's library: "${targetBook.title}" with ID: ${targetBook.id}`);
          } else {
            log(`Requested book not found in author's current library, need to look it up`);
          }
        }
      }

      // If book not found in existing library, look it up with robust matching
      if (!targetBook) {
        log(`Looking up book in Readarr's database: ${processedData.title}`);

        // Search by title and author - use quotes for exact matching
        const searchTerm = `"${processedData.title}" ${processedData.author}`;
        let bookLookupResponse;
        
        try {
          bookLookupResponse = await readarrAPI.get(`/api/v1/book/lookup?term=${encodeURIComponent(searchTerm)}`);
        } catch (error) {
          log(`Exact title search failed: ${error.message}, trying without quotes`);
          // Try without quotes if exact search fails
          bookLookupResponse = await readarrAPI.get(`/api/v1/book/lookup?term=${encodeURIComponent(processedData.title + ' ' + processedData.author)}`);
        }

        if (!bookLookupResponse.data?.length) {
          throw new Error(`Book not found in Readarr lookup: ${processedData.title}`);
        }

        // First check for exact title and author match
        const exactMatch = bookLookupResponse.data.find(book => 
          normalizeText(book.title) === normalizeText(processedData.title) && 
          book.authorName && normalizeText(book.authorName) === normalizeText(processedData.author));
          
        if (exactMatch) {
          log(`Found exact title and author match: "${exactMatch.title}" by ${exactMatch.authorName}`);
          
          // Add the book to the author's library
          const bookPayload = {
            authorId: authorId,
            foreignBookId: exactMatch.foreignBookId,
            title: exactMatch.title,
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
              const exactBookMatch = checkBooksResponse.data.find(book => 
                normalizeText(book.title) === normalizeText(processedData.title));
                
              if (exactBookMatch) {
                targetBook = exactBookMatch;
                log(`Found book in library after all: "${targetBook.title}" with ID: ${targetBook.id}`);
              } else {
                // Try with fuzzy matching
                targetBook = findBestBookMatch(checkBooksResponse.data, processedData.title, processedData.author);
                
                if (targetBook) {
                  log(`Found book in library with fuzzy matching: "${targetBook.title}" with ID: ${targetBook.id}`);
                } else {
                  throw new Error(`Failed to add book and couldn't find it in library: ${processedData.title}`);
                }
              }
            } else {
              throw new Error(`Failed to add book and no books found in library: ${processedData.title}`);
            }
          }
        } else {
          // Use improved book matching
          const bestBookMatch = findBestBookMatch(bookLookupResponse.data, processedData.title, processedData.author);
          
          if (!bestBookMatch) {
            throw new Error(`No suitable book match found for: ${processedData.title}`);
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
              const exactBookMatch = checkBooksResponse.data.find(book => 
                normalizeText(book.title) === normalizeText(processedData.title));
                
              if (exactBookMatch) {
                targetBook = exactBookMatch;
                log(`Found book in library after all: "${targetBook.title}" with ID: ${targetBook.id}`);
              } else {
                // Try with fuzzy matching
                targetBook = findBestBookMatch(checkBooksResponse.data, processedData.title, processedData.author);
                
                if (targetBook) {
                  log(`Found book in library with fuzzy matching: "${targetBook.title}" with ID: ${targetBook.id}`);
                } else {
                  throw new Error(`Failed to add book and couldn't find it in library: ${processedData.title}`);
                }
              }
            } else {
              throw new Error(`Failed to add book and no books found in library: ${processedData.title}`);
            }
          }
        }
      }

      // Make sure we have a target book at this point
      if (!targetBook) {
        throw new Error(`Could not find or add the requested book: ${processedData.title}`);
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
      log(`\n==== Searching for book: "${title}" by ${author} ====`);
      
      // Preprocess the input to handle ambiguous formats
      const processedData = preprocessBookData({ title, author });
      log(`Processed search terms: "${processedData.title}" by ${processedData.author}`);
      
      // Step 1: Search for author
      const authorLookupResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(processedData.author)}`);
      
      if (!authorLookupResponse.data?.length) {
        log(`Author not found: ${processedData.author}`);
        return { success: false, message: `Author not found: ${processedData.author}` };
      }
      
      // Step 2: Use robust author matching
      const bestAuthorMatch = findBestAuthorMatch(authorLookupResponse.data, processedData.author);
      
      if (!bestAuthorMatch) {
        log(`No suitable author match found for: ${processedData.author}`);
        return { success: false, message: `No suitable author match found for: ${processedData.author}` };
      }
      
      log(`Best author match: ${bestAuthorMatch.authorName}`);
      
      // Step 3: Search for the book
      const searchTerm = `${processedData.title} ${processedData.author}`;
      const bookLookupResponse = await readarrAPI.get(`/api/v1/book/lookup?term=${encodeURIComponent(searchTerm)}`);
      
      if (!bookLookupResponse.data?.length) {
        log(`No books found matching: ${searchTerm}`);
        return { success: false, message: `No books found matching: ${searchTerm}` };
      }
      
      // Step 4: Use robust book matching
      const bestBookMatch = findBestBookMatch(bookLookupResponse.data, processedData.title, processedData.author);
      
      if (!bestBookMatch) {
        log(`No suitable book match found for: ${processedData.title}`);
        return { success: false, message: `No suitable book match found for: ${processedData.title}` };
      }
      
      log(`Best book match: "${bestBookMatch.title}" by ${bestBookMatch.authorName || 'Unknown'}`);
      
      // Return success with the matched book and author
      return {
        success: true,
        book: bestBookMatch,
        author: bestAuthorMatch,
        originalRequest: { title, author },
        processedRequest: processedData
      };
    } catch (error) {
      log(`Error searching for book: ${error.message}`);
      return { success: false, message: error.message };
    }
  },
  
  // Function to directly test the author matching
  testAuthorMatch: async (searchAuthorName) => {
    try {
      log(`\n==== Testing author matching for: ${searchAuthorName} ====`);
      
      // Preprocess author name
      const processedAuthor = preprocessBookData({ title: '', author: searchAuthorName }).author;
      log(`Processed author name: ${processedAuthor}`);
      
      const authorLookupResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(processedAuthor)}`);
      
      if (!authorLookupResponse.data?.length) {
        return { success: false, message: `No authors found matching: ${processedAuthor}` };
      }
      
      // Get the full author details for each result
      const authorResults = authorLookupResponse.data;
      log(`Found ${authorResults.length} author results`);
      
      // Find best match using our robust algorithm
      const bestMatch = findBestAuthorMatch(authorResults, processedAuthor);
      
      return {
        success: true,
        originalName: searchAuthorName,
        processedName: processedAuthor,
        bestMatch: bestMatch,
        allResults: authorResults.map(author => ({
          id: author.id,
          name: author.authorName,
          titleSlug: author.titleSlug,
          bookCount: author.bookCount || 0,
          rating: author.ratings?.value || 0
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
      log(`\n==== Testing book matching for: "${searchTitle}" by ${searchAuthor} ====`);
      
      // Preprocess the input
      const processedData = preprocessBookData({ title: searchTitle, author: searchAuthor });
      log(`Processed search terms: "${processedData.title}" by ${processedData.author}`);
      
      // Search by title and author
      const searchTerm = `${processedData.title} ${processedData.author}`;
      const bookLookupResponse = await readarrAPI.get(`/api/v1/book/lookup?term=${encodeURIComponent(searchTerm)}`);
      
      if (!bookLookupResponse.data?.length) {
        return { 
          success: false, 
          message: `No books found matching: ${searchTerm}`,
          originalRequest: { title: searchTitle, author: searchAuthor },
          processedRequest: processedData
        };
      }
      
      // Find best match using our robust algorithm
      const bookResults = bookLookupResponse.data;
      log(`Found ${bookResults.length} book results`);
      
      const bestMatch = findBestBookMatch(bookResults, processedData.title, processedData.author);
      
      return {
        success: true,
        originalRequest: { title: searchTitle, author: searchAuthor },
        processedRequest: processedData,
        bestMatch: bestMatch,
        allResults: bookResults.map(book => ({
          id: book.id,
          title: book.title,
          author: book.authorName || book.author || 'Unknown',
          releaseDate: book.releaseDate,
          overview: book.overview?.substring(0, 100) + (book.overview?.length > 100 ? '...' : '')
        }))
      };
    } catch (error) {
      log(`Error testing book match: ${error.message}`);
      return { success: false, message: error.message };
    }
  },
  
  // Diagnostic helper for troubleshooting
  diagnosticTest: async (title, author) => {
    log(`\n-------- DIAGNOSTIC TEST: "${title}" by "${author}" --------`);
    
    const processedData = preprocessBookData({ title, author });
    log(`Processed: "${processedData.title}" by "${processedData.author}"`);
    
    // Test exact search
    log("\nSimulating exact search...");
    const exactSearchTerm = `"${processedData.title}" ${processedData.author}`;
    log(`Search term: ${exactSearchTerm}`);
    
    // Test existing author check
    log("\nSimulating author check...");
    const authorSearchTerm = `"${processedData.author}"`;
    log(`Author search term: ${authorSearchTerm}`);
    
    // Test book search 
    log("\nSimulating book search...");
    const bookSearchTerm = `"${processedData.title}" ${processedData.author}`;
    log(`Book search term: ${bookSearchTerm}`);
    
    // Extract core title
    const coreTitle = extractCoreTitle(processedData.title.toLowerCase());
    log(`Core title: "${coreTitle}"`);
    
    log("\n-------- END DIAGNOSTIC TEST --------\n");
    
    return {
      processedData,
      searchTerms: {
        exact: exactSearchTerm,
        author: authorSearchTerm,
        book: bookSearchTerm
      },
      coreTitle
    };
  }
};