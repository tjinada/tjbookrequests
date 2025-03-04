// controllers/requestController.js
const Request = require('../models/Request');
const readarrAPI = require('../config/readarr');
const calibreAPI = require('../config/calibreAPI');
const googleBooksAPI = require('../config/googleBooks');
const openLibraryAPI = require('../config/openLibrary');
const fs = require('fs');
const path = require('path');

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/readarr.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

exports.createRequest = async (req, res) => {
  try {
    const { bookId, title, author, cover, isbn, source } = req.body;

    // Check if request already exists
    const existingRequest = await Request.findOne({ 
      user: req.user.id, 
      bookId 
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Book already requested' });
    }

    // Create new request
    const newRequest = new Request({
      user: req.user.id,
      bookId,
      title,
      author,
      cover,
      isbn,
      source
    });

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    console.error('Error creating request:', err);
    res.status(500).send('Server error');
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    // Only admin can update request status
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'denied', 'available'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // If approving the request, add book to Readarr
    if (status === 'approved' && request.status !== 'approved') {
      try {
        log(`Processing request approval for: "${request.title}" by ${request.author}`);
        
        // Get more detailed book information based on source if available
        let enrichedBookData = {
          title: request.title,
          author: request.author,
          isbn: request.isbn
        };
        
        // If source is specified, get richer metadata
        if (request.source) {
          try {
            log(`Getting enhanced metadata from ${request.source} for book: ${request.bookId}`);
            let bookDetails;
            
            if (request.source === 'google') {
              // Remove 'gb-' prefix if present
              const googleId = request.bookId.startsWith('gb-') ? 
                request.bookId.substring(3) : request.bookId;
              bookDetails = await googleBooksAPI.getBookDetails(googleId);
            } else if (request.source === 'openLibrary') {
              // Remove 'ol-' prefix if present
              const olId = request.bookId.startsWith('ol-') ? 
                request.bookId.substring(3) : request.bookId;
              bookDetails = await openLibraryAPI.getBookDetails(olId);
            }
            
            if (bookDetails) {
              // Get author information for better matching
              let authorInfo = null;
              if (request.source === 'google' && bookDetails.author) {
                // Extract the primary author (first in the list)
                const primaryAuthor = bookDetails.author.split(',')[0].trim();
                try {
                  authorInfo = await googleBooksAPI.searchAuthor(primaryAuthor);
                  log(`Found author information for ${primaryAuthor}`);
                } catch (authorErr) {
                  log(`Error getting author info: ${authorErr.message}, will continue without it`);
                }
              }
              
              // Enhance book data with metadata
              enrichedBookData = {
                ...enrichedBookData,
                title: bookDetails.title || request.title,
                author: bookDetails.author || request.author,
                isbn: bookDetails.isbn || request.isbn,
                // Add additional metadata
                authorMetadata: authorInfo ? {
                  name: authorInfo.name,
                  books: authorInfo.books?.length || 0,
                  genres: authorInfo.primaryGenres || []
                } : null,
                bookMetadata: {
                  title: bookDetails.title || request.title,
                  source: request.source,
                  sourceId: request.bookId,
                  publishYear: bookDetails.year
                }
              };
              
              log(`Enhanced book data: ${JSON.stringify(enrichedBookData)}`);
            }
          } catch (metadataError) {
            log(`Error getting enhanced metadata: ${metadataError.message}`);
            // Continue with basic metadata if enhanced fails
          }
        }

        // WORKFLOW: Check if author already exists in Readarr
        log(`Step 1: Checking if author "${enrichedBookData.author}" already exists in Readarr...`);
        
        // First check existing authors in Readarr
        const existingAuthorsResponse = await readarrAPI.get('/api/v1/author');
        let existingAuthor = null;
        let authorId = null;
        
        if (existingAuthorsResponse.data?.length) {
          // Use robust author matching to find the best match
          existingAuthor = findBestAuthorMatch(existingAuthorsResponse.data, enrichedBookData.author);
          
          if (existingAuthor) {
            authorId = existingAuthor.id;
            log(`Found existing author in Readarr: "${existingAuthor.authorName}" with ID: ${authorId}`);
          } else {
            log(`No matching author found among ${existingAuthorsResponse.data.length} existing authors`);
          }
        }
        
        // If author is found, check if the book already exists under this author
        let targetBook = null;
        
        if (authorId) {
          log(`Step 2: Author exists. Checking if book "${enrichedBookData.title}" exists for this author...`);
          
          try {
            // Get all books for this author from Readarr
            const authorBooksResponse = await readarrAPI.get(`/api/v1/book?authorId=${authorId}&includeAllAuthorBooks=true`);
            const booksList = authorBooksResponse.data || [];
            log(`Found ${booksList.length} books for author in Readarr`);
            
            if (booksList.length > 0) {
              // Use robust book matching to find the best match
              targetBook = findBestBookMatch(booksList, enrichedBookData.title, enrichedBookData.author);
              
              if (targetBook) {
                log(`Found matching book in author's library: "${targetBook.title}" with ID: ${targetBook.id}`);
                
                // Book already exists - update request with this information
                request.readarrStatus = 'added';
                request.readarrId = targetBook.id;
                request.readarrMessage = 'Book already exists in Readarr, triggering search';
                
                // Trigger a search for the existing book
                log(`Triggering search for existing book ID: ${targetBook.id}`);
                const searchPayload = {
                  name: "BookSearch",
                  bookIds: [targetBook.id]
                };
                
                await readarrAPI.post('/api/v1/command', searchPayload);
                log(`Search command sent for existing book`);
              } else {
                log(`Book not found in author's current library, will need to add it`);
              }
            }
          } catch (bookSearchError) {
            log(`Error searching for books under author: ${bookSearchError.message}`);
          }
        }
        
        // If book not found under existing author (or author doesn't exist), proceed with lookup
        if (!targetBook) {
          log(`Step 3: Need to look up book in Readarr database...`);
          
          // Search for the book in Readarr's database
          const searchTerm = `${enrichedBookData.title} ${enrichedBookData.author}`;
          let bookLookupResponse;
          
          try {
            bookLookupResponse = await readarrAPI.get(`/api/v1/book/lookup?term=${encodeURIComponent(searchTerm)}`);
          } catch (lookupError) {
            throw new Error(`Book lookup failed: ${lookupError.message}`);
          }
          
          if (!bookLookupResponse.data?.length) {
            throw new Error(`No books found matching: ${searchTerm}`);
          }
          
          // Use robust book matching to find the best match
          const bestBookMatch = findBestBookMatch(bookLookupResponse.data, enrichedBookData.title, enrichedBookData.author);
          
          if (!bestBookMatch) {
            throw new Error(`No suitable book match found for: ${enrichedBookData.title}`);
          }
          
          log(`Found best book match: "${bestBookMatch.title}" by ${bestBookMatch.authorName || 'Unknown'}`);
          
          // If we still don't have an author ID, we need to add the author first
          if (!authorId) {
            log(`Step 4: Author not in Readarr. Adding author: ${bestBookMatch.authorName || enrichedBookData.author}`);
            
            try {
              // Get profiles for creating author
              const [qualityProfiles, metadataProfiles, rootFolders] = await Promise.all([
                readarrAPI.get('/api/v1/qualityprofile'),
                readarrAPI.get('/api/v1/metadataprofile'),
                readarrAPI.get('/api/v1/rootfolder')
              ]);
              
              if (!qualityProfiles.data?.length) throw new Error('No quality profiles found in Readarr');
              if (!metadataProfiles.data?.length) throw new Error('No metadata profiles found in Readarr');
              if (!rootFolders.data?.length) throw new Error('No root folders found in Readarr');
              
              const qualityProfileId = qualityProfiles.data[0].id;
              const metadataProfileId = metadataProfiles.data[0].id;
              const rootFolderPath = rootFolders.data[0].path;
              
              // Create author payload
              const authorPayload = {
                authorName: bestBookMatch.authorName || enrichedBookData.author,
                foreignAuthorId: bestBookMatch.authorId || bestBookMatch.foreignAuthorId,
                titleSlug: bestBookMatch.authorTitleSlug || bestBookMatch.titleSlug,
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
              
              log(`Adding new author with payload: ${JSON.stringify(authorPayload)}`);
              
              const authorResponse = await readarrAPI.post('/api/v1/author', authorPayload);
              authorId = authorResponse.data.id;
              log(`Created new author with ID: ${authorId}`);
              
              // Wait for Readarr to process the new author
              await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (authorError) {
              throw new Error(`Failed to add author: ${authorError.message}`);
            }
          }
          
          // Now add the book to the author
          log(`Step 5: Adding book "${bestBookMatch.title}" to author ID: ${authorId}`);
          
          try {
            // Get profiles again if we need them
            let qualityProfileId, metadataProfileId, rootFolderPath;
            
            if (!qualityProfileId) {
              const [qualityProfiles, metadataProfiles, rootFolders] = await Promise.all([
                readarrAPI.get('/api/v1/qualityprofile'),
                readarrAPI.get('/api/v1/metadataprofile'),
                readarrAPI.get('/api/v1/rootfolder')
              ]);
              
              qualityProfileId = qualityProfiles.data[0].id;
              metadataProfileId = metadataProfiles.data[0].id;
              rootFolderPath = rootFolders.data[0].path;
            }
            
            // Create book payload
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
            
            const addResponse = await readarrAPI.post('/api/v1/book', bookPayload);
            targetBook = addResponse.data;
            log(`Book added to library with ID: ${targetBook.id}`);
            
            // Update request status
            request.readarrStatus = 'added';
            request.readarrId = targetBook.id;
            request.readarrMessage = 'Book added to Readarr, searching for downloads';
            
            // Trigger search for the book
            log(`Triggering search for book ID: ${targetBook.id}`);
            const searchPayload = {
              name: "BookSearch",
              bookIds: [targetBook.id]
            };
            
            await readarrAPI.post('/api/v1/command', searchPayload);
            log(`Search command sent for book`);
          } catch (addBookError) {
            throw new Error(`Failed to add book: ${addBookError.message}`);
          }
        }
      } catch (error) {
        console.error('Error adding book to Readarr:', error);
        log(`ERROR in Readarr flow: ${error.message}`);

        // Still update the request status, but note the error
        request.readarrStatus = 'error';
        request.readarrMessage = error.message || 'Error adding to Readarr';
      }
    }

    request.status = status;
    await request.save();

    res.json(request);
  } catch (err) {
    console.error('Error updating request status:', err);
    res.status(500).send('Server error');
  }
};

exports.getUserRequests = async (req, res) => {
  try {
    const requests = await Request.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    // Only admin can view all requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const requests = await Request.find()
      .populate('user', 'username email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Enhanced version to also check/update metadata
exports.checkRequestsStatus = async (req, res) => {
  try {
    // Only admin can run this check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get approved requests with readarrId that aren't marked as 'downloaded'
    const requests = await Request.find({
      status: 'approved',
      readarrId: { $exists: true, $ne: '' },
      readarrStatus: { $ne: 'downloaded' }
    }).populate('user', 'username');

    if (requests.length === 0) {
      return res.json({ message: 'No requests to check', updatedCount: 0 });
    }

    log(`Checking status for ${requests.length} requests`);

    // Check each request
    let updatedCount = 0;
    let metadataUpdatedCount = 0;
    let metadataFailedCount = 0;

    for (const request of requests) {
      try {
        // Check if the book is available in Readarr
        const bookStatus = await readarrAPI.getBookStatus(request.readarrId);
        log(`Request ${request._id}: Book ${request.readarrId} status - isDownloaded: ${bookStatus.isDownloaded}`);

        if (bookStatus.isDownloaded) {
          // Update metadata if file path is available
          if (bookStatus.bookFilePath) {
            try {
              log(`Updating metadata for book: ${request.title} (file: ${bookStatus.bookFilePath})`);
              
              await calibreAPI.updateBookMetadata(bookStatus.bookFilePath, {
                user: request.user.username,
                userId: request.user._id.toString()
              });
              
              log(`Metadata updated for book: ${request.title}`);
              metadataUpdatedCount++;
              
              // Update the request status
              request.readarrStatus = 'downloaded';
              request.status = 'available';
              request.readarrMessage = 'Book is downloaded and available with metadata';
              await request.save();
              updatedCount++;
            } catch (metadataError) {
              log(`Error updating metadata: ${metadataError.message}`);
              metadataFailedCount++;
              
              // Still update request status but note the error
              request.readarrStatus = 'downloaded';
              request.status = 'available';
              request.readarrMessage = `Book is downloaded but metadata update failed: ${metadataError.message}`;
              await request.save();
              updatedCount++;
            }
          } else {
            // No file path, but still update status
            log(`No file path available for book: ${request.title}`);
            request.readarrStatus = 'downloaded';
            request.status = 'available';
            request.readarrMessage = 'Book is downloaded and available (no file path for metadata)';
            await request.save();
            updatedCount++;
          }
        }
      } catch (error) {
        log(`Error checking status for request ${request._id}: ${error.message}`);
      }
    }

    res.json({ 
      message: `Checked ${requests.length} requests, updated ${updatedCount}`,
      updatedCount,
      metadataStats: {
        updated: metadataUpdatedCount,
        failed: metadataFailedCount
      }
    });
  } catch (err) {
    log(`Error checking requests status: ${err.message}`);
    res.status(500).send('Server error');
  }
};

// Manual metadata update for a specific request
exports.updateRequestMetadata = async (req, res) => {
  try {
    // Only admin can update metadata
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    const request = await Request.findById(id).populate('user', 'username');
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if the request has a Readarr ID
    if (!request.readarrId) {
      return res.status(400).json({ message: 'Request does not have a Readarr ID' });
    }

    // Get book status from Readarr
    const bookStatus = await readarrAPI.getBookStatus(request.readarrId);
    
    if (!bookStatus.isDownloaded) {
      return res.status(400).json({ message: 'Book is not downloaded yet' });
    }

    if (!bookStatus.bookFilePath) {
      return res.status(400).json({ message: 'No file path available for the book' });
    }

    // Update metadata
    await calibreAPI.updateBookMetadata(bookStatus.bookFilePath, {
      user: request.user.username,
      userId: request.user._id.toString()
    });

    // Update request status
    request.readarrStatus = 'downloaded';
    request.status = 'available';
    request.readarrMessage = 'Book is downloaded and metadata updated manually';
    await request.save();

    res.json({
      message: 'Metadata updated successfully',
      request
    });
  } catch (err) {
    log(`Error updating metadata: ${err.message}`);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};