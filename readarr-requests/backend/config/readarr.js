// config/readarr.js - Updated using the GET endpoint approach
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const readarrAPI = axios.create({
  baseURL: process.env.READARR_API_URL,
  headers: {
    'X-Api-Key': process.env.READARR_API_KEY
  }
});

// Add logging to help troubleshoot
const logFile = path.join(__dirname, '../logs/readarr.log');
fs.mkdirSync(path.dirname(logFile), { recursive: true });

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

// Helper function to find the best match by title
function findBestBookMatch(books, searchTitle) {
  if (!books || books.length === 0) return null;

  // Normalize search title
  const normalizedSearch = searchTitle.toLowerCase();

  // First look for exact matches or close matches
  const matchingBooks = books.filter(book => {
    const bookTitle = book.title.toLowerCase();
    return bookTitle.includes(normalizedSearch) || normalizedSearch.includes(bookTitle);
  });

  if (matchingBooks.length > 0) {
    // Sort by title length (prefer shorter, more specific titles)
    return matchingBooks.sort((a, b) => a.title.length - b.title.length)[0];
  }

  // If no matches, return the first book as a fallback
  return books[0];
}

module.exports = {
  // Updated addBook function using the GET endpoint approach
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

      // Step 2: Check if the author exists or create it
      let authorId;

      // First check existing authors
      const existingAuthorsResponse = await readarrAPI.get('/api/v1/author');
      const existingAuthor = existingAuthorsResponse.data.find(author => {
        const authorName = author.authorName.toLowerCase();
        const searchName = bookData.author.toLowerCase();
        return authorName === searchName || authorName.includes(searchName) || searchName.includes(authorName);
      });

      if (existingAuthor) {
        authorId = existingAuthor.id;
        log(`Using existing author with ID: ${authorId}`);
      } else {
        // Look up the author
        const authorLookupResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(bookData.author)}`);

        if (!authorLookupResponse.data?.length) {
          throw new Error(`Author not found: ${bookData.author}`);
        }

        // Use the first author result
        const authorToAdd = authorLookupResponse.data[0];

        // Create author payload
        const authorPayload = {
          authorName: authorToAdd.authorName,
          foreignAuthorId: authorToAdd.foreignAuthorId,
          titleSlug: authorToAdd.titleSlug,
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

        log(`Creating author with payload: ${JSON.stringify(authorPayload)}`);

        const authorResponse = await readarrAPI.post('/api/v1/author', authorPayload);
        authorId = authorResponse.data.id;
        log(`Created author with ID: ${authorId}`);

        // Wait a moment for Readarr to process the new author
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 3: Get all books for this author
      log(`Getting books for author ID: ${authorId}`);
      // Use the endpoint you discovered - this is much more reliable!
      const authorBooksResponse = await readarrAPI.get(`/api/v1/book?authorId=${authorId}&includeAllAuthorBooks=false`);

      if (!authorBooksResponse.data?.length) {
        log(`No books found for author, waiting a bit longer and trying again...`);
        // Wait a bit longer and try once more
        await new Promise(resolve => setTimeout(resolve, 5000));
        const retryResponse = await readarrAPI.get(`/api/v1/book?authorId=${authorId}&includeAllAuthorBooks=false`);

        if (!retryResponse.data?.length) {
          throw new Error(`No books found for author ID: ${authorId}`);
        }

        authorBooksResponse.data = retryResponse.data;
      }

      log(`Found ${authorBooksResponse.data.length} books for author`);

      // Step 4: Find the book that matches the requested title
      const matchedBook = findBestBookMatch(authorBooksResponse.data, bookData.title);

      if (!matchedBook) {
        throw new Error(`Could not find a matching book for: ${bookData.title}`);
      }

      log(`Found matching book: "${matchedBook.title}" with ID: ${matchedBook.id}`);

      // Step 5: Update the book to be monitored
      // if (!matchedBook.monitored) {
      //   log(`Setting book to monitored`);

      //   // Create an update payload with monitored set to true
      //   const updatePayload = {
      //     ...matchedBook,
      //     monitored: true
      //   };

      //   await readarrAPI.put(`/api/v1/book/${matchedBook.id}`, updatePayload);
      //   log(`Updated book to monitored status`);
      // } else {
      //   log(`Book is already monitored`);
      // }

      // Step 6: Trigger a search for the book
      log(`Triggering search for book ID: ${matchedBook.id}`);

      const searchPayload = {
        name: "BookSearch",
        bookIds: [matchedBook.id]
      };

      const searchResponse = await readarrAPI.post('/api/v1/command', searchPayload);
      log(`Search command successful: Command ID: ${searchResponse.data.id}, Status: ${searchResponse.data.status}`);

      // Return the book with search information
      return {
        ...matchedBook,
        searchCommandId: searchResponse.data.id,
        searchStatus: searchResponse.data.status
      };
    } catch (error) {
      log(`ERROR: ${error.message}`);
      throw error;
    }
  }
};