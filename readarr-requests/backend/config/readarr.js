// config/readarr.js - Updated with better existing author handling
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

const getOrCreateTag = async (tagName) => {
  try {
    log(`Looking for tag: ${tagName}`);

    // Get all existing tags
    const tagsResponse = await readarrAPI.get('/api/v1/tag');

    if (tagsResponse.data) {
      // Check if tag already exists
      const existingTag = tagsResponse.data.find(
        tag => tag.label.toLowerCase() === tagName.toLowerCase()
      );

      if (existingTag) {
        log(`Found existing tag: ${existingTag.label} (ID: ${existingTag.id})`);
        return existingTag.id;
      }
    }

    // Tag doesn't exist, create it
    log(`Creating new tag: ${tagName}`);
    const createResponse = await readarrAPI.post('/api/v1/tag', {
      label: tagName
    });

    log(`Created tag with ID: ${createResponse.data.id}`);
    return createResponse.data.id;
  } catch (error) {
    log(`Error managing tag: ${error.message}`);
    // Return null but continue the process - tags are helpful but not critical
    return null;
  }
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

  // If no matches, return null
  return null;
}

// Helper function to normalize author names for better matching
function normalizeAuthorName(name) {
  return name.toLowerCase()
    .replace(/\./g, '') // Remove periods
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Helper function to find an author with a better matching algorithm
function findAuthorMatch(authors, searchName) {
  const normalizedSearch = normalizeAuthorName(searchName);

  // Try different matching strategies

  // 1. Exact match
  let match = authors.find(author => 
    normalizeAuthorName(author.authorName) === normalizedSearch
  );
  if (match) return match;

  // 2. One name contains the other
  match = authors.find(author => {
    const authorName = normalizeAuthorName(author.authorName);
    return authorName.includes(normalizedSearch) || normalizedSearch.includes(authorName);
  });
  if (match) return match;

  // 3. Check for name variations with initials
  // This helps with cases like "George R.R. Martin" vs "George Martin"
  match = authors.find(author => {
    const authorName = normalizeAuthorName(author.authorName);
    const parts = normalizedSearch.split(' ');
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    // Check if first and last name match
    return authorName.includes(firstName) && authorName.includes(lastName);
  });

  return match || null;
}

module.exports = {
  // Updated addBook function with improved existing author handling
  getOrCreateTag,
  addBook: async (bookData, tags = []) => {
    try {
      log(`Starting to add book: ${bookData.title} by ${bookData.author}`);

      if (tags.length > 0) {
        log(`With tags: ${tags.join(', ')}`);
      }

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
      const rootFolderPath = rootFolders.data[1].path;

      log(`Using profiles - Quality: ${qualityProfileId}, Metadata: ${metadataProfileId}, Root: ${rootFolderPath}`);

      // Step 2: Check if the author exists using improved author matching
      let authorId;
      let isExistingAuthor = false;

      log(`Checking if author exists: ${bookData.author}`);
      const existingAuthorsResponse = await readarrAPI.get('/api/v1/author');

      if (existingAuthorsResponse.data?.length) {
        // Use the improved author matching function
        const existingAuthor = findAuthorMatch(existingAuthorsResponse.data, bookData.author);

        if (existingAuthor) {
          authorId = existingAuthor.id;
          isExistingAuthor = true;
          log(`Found existing author: ${existingAuthor.authorName} with ID: ${authorId}`);
        } else {
          log(`No matching author found among ${existingAuthorsResponse.data.length} existing authors`);
        }
      }

      // Process tags - convert tag names to tag IDs
      let tagIds = [];
      if (tags.length > 0) {
        // Process each tag
        for (const tagName of tags) {
          const tagId = await getOrCreateTag(tagName);
          if (tagId) {
            tagIds.push(tagId);
          }
        }
        log(`Processed tags: ${tagIds.join(', ')}`);
      }

      // If author doesn't exist, create a new one
      if (!authorId) {
        log(`Author not found in existing authors, looking up in Readarr's database`);
        const authorLookupResponse = await readarrAPI.get(`/api/v1/author/lookup?term=${encodeURIComponent(bookData.author)}`);

        if (!authorLookupResponse.data?.length) {
          throw new Error(`Author not found in Readarr lookup: ${bookData.author}`);
        }

        // Use the first author result (most relevant)
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

      // Step 4: Find the requested book among the author's books
      let targetBook = null;

      if (booksList.length > 0) {
        // Try to find the book in the existing list
        targetBook = findBestBookMatch(booksList, bookData.title);

        if (targetBook) {
          log(`Found matching book in author's library: "${targetBook.title}" with ID: ${targetBook.id}`);
        } else {
          log(`Requested book not found in author's current library, need to look it up`);
        }
      }

      // If book not found in existing library and this is an existing author,
      // we need to perform a book lookup and potentially add it
      if (!targetBook && isExistingAuthor) {
        log(`Looking up book in Readarr's database: ${bookData.title}`);

        // Search by title and author
        const searchTerm = `${bookData.title} ${bookData.author}`;
        const bookLookupResponse = await readarrAPI.get(`/api/v1/book/lookup?term=${encodeURIComponent(searchTerm)}`);

        if (!bookLookupResponse.data?.length) {
          throw new Error(`Book not found in Readarr lookup: ${bookData.title}`);
        }

        // Find the best match from lookup results
        const lookupBooks = bookLookupResponse.data;
        log(`Found ${lookupBooks.length} books in lookup results`);

        // Find books that match the title
        const matchingBooks = lookupBooks.filter(book => {
          const bookTitle = book.title.toLowerCase();
          const searchTitle = bookData.title.toLowerCase();
          return bookTitle.includes(searchTitle) || searchTitle.includes(bookTitle);
        });

        if (matchingBooks.length === 0) {
          log(`No matching books found in lookup, using first result`);
          matchingBooks.push(lookupBooks[0]);
        }

        // Select the first matching book
        const bookToAdd = matchingBooks[0];
        log(`Selected book to add: "${bookToAdd.title}"`);

        // Add the book to the author's library
        const bookPayload = {
          authorId: authorId,
          foreignBookId: bookToAdd.foreignBookId,
          title: bookToAdd.title,
          qualityProfileId: qualityProfileId,
          metadataProfileId: metadataProfileId,
          rootFolderPath: rootFolderPath,
          monitored: true,
          tags: tagIds,
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
            targetBook = findBestBookMatch(checkBooksResponse.data, bookData.title);

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

  getBookStatus: async (bookId, tagIds) => {
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
  
      return {
        id: bookId,
        title: bookResponse.data.title,
        isDownloaded: isDownloaded,
        percentOfBook: percentOfBook,
        hasFile: bookResponse.data.statistics?.bookFileCount > 0,
        sizeOnDisk: bookResponse.data.statistics?.sizeOnDisk || 0,
        tags: tagIds
      };
    } catch (error) {
      log(`Error checking book status: ${error.message}`);
      throw error;
    }
  },

  updateBookTags: async (bookId, tagIds) => {
    try {
      log(`Updating tags for book ID: ${bookId}`);

      // First get the current book data
      const bookResponse = await readarrAPI.get(`/api/v1/book/${bookId}`);

      if (!bookResponse.data) {
        throw new Error(`Book with ID ${bookId} not found`);
      }

      // Create update payload with new tags
      const updatePayload = {
        ...bookResponse.data,
        tags: tagIds
      };

      // Update the book
      await readarrAPI.put(`/api/v1/book/${bookId}`, updatePayload);
      log(`Tags updated successfully for book ID: ${bookId}`);

      return true;
    } catch (error) {
      log(`Error updating book tags: ${error.message}`);
      throw error;
    }
  }
};