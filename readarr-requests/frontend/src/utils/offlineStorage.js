// src/utils/offlineStorage.js
import api from './api';

/**
 * IndexedDB setup for storing books for offline reading
 */
const DB_NAME = 'readarr_offline_library';
const DB_VERSION = 1;
const BOOK_STORE = 'books';
const METADATA_STORE = 'metadata';

// Initialize the database
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    // Create object stores when needed
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create store for book content (binary data)
      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        const bookStore = db.createObjectStore(BOOK_STORE, { keyPath: 'id' });
        bookStore.createIndex('format', 'format', { unique: false });
        bookStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
      }
      
      // Create store for book metadata
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        const metaStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
        metaStore.createIndex('title', 'title', { unique: false });
        metaStore.createIndex('author', 'author', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };
    
    request.onerror = (event) => {
      console.error('Error opening database:', event.target.error);
      reject(event.target.error);
    };
  });
};

/**
 * Save a book's binary data to IndexedDB
 * @param {string} id - Book ID
 * @param {string} format - Book format (epub, pdf, etc.)
 * @param {Blob|ArrayBuffer} data - Book binary data
 * @returns {Promise<boolean>} - Success status
 */
export const saveBookData = async (id, format, data) => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BOOK_STORE], 'readwrite');
      const store = transaction.objectStore(BOOK_STORE);
      
      const bookData = {
        id: `${id}_${format}`,
        bookId: id,
        format: format.toLowerCase(),
        data,
        lastAccessed: new Date().toISOString()
      };
      
      const request = store.put(bookData);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('Error saving book data:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to save book data:', error);
    return false;
  }
};

/**
 * Save book metadata to IndexedDB
 * @param {Object} metadata - Book metadata
 * @returns {Promise<boolean>} - Success status
 */
export const saveBookMetadata = async (metadata) => {
  if (!metadata || !metadata.id) {
    return false;
  }
  
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      
      const request = store.put({
        ...metadata,
        lastUpdated: new Date().toISOString()
      });
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('Error saving book metadata:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to save book metadata:', error);
    return false;
  }
};

/**
 * Get book data from IndexedDB
 * @param {string} id - Book ID
 * @param {string} format - Book format
 * @returns {Promise<Blob|null>} - Book data as Blob
 */
export const getBookData = async (id, format) => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BOOK_STORE], 'readonly');
      const store = transaction.objectStore(BOOK_STORE);
      
      const request = store.get(`${id}_${format}`);
      
      request.onsuccess = (event) => {
        const result = event.target.result;
        if (result) {
          // Update last accessed timestamp
          updateLastAccessed(id, format).catch(console.error);
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        console.error('Error getting book data:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get book data:', error);
    return null;
  }
};

/**
 * Get book metadata from IndexedDB
 * @param {string} id - Book ID
 * @returns {Promise<Object|null>} - Book metadata
 */
export const getBookMetadata = async (id) => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      
      const request = store.get(id);
      
      request.onsuccess = (event) => {
        resolve(event.target.result || null);
      };
      
      request.onerror = (event) => {
        console.error('Error getting book metadata:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get book metadata:', error);
    return null;
  }
};

/**
 * Update last accessed timestamp for a book
 * @param {string} id - Book ID
 * @param {string} format - Book format
 * @returns {Promise<boolean>} - Success status
 */
const updateLastAccessed = async (id, format) => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BOOK_STORE], 'readwrite');
      const store = transaction.objectStore(BOOK_STORE);
      
      const bookId = `${id}_${format}`;
      const request = store.get(bookId);
      
      request.onsuccess = (event) => {
        const book = event.target.result;
        if (book) {
          book.lastAccessed = new Date().toISOString();
          store.put(book);
          resolve(true);
        } else {
          resolve(false);
        }
      };
      
      request.onerror = (event) => {
        console.error('Error updating last accessed:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to update last accessed:', error);
    return false;
  }
};

/**
 * Delete a book from IndexedDB
 * @param {string} id - Book ID
 * @param {string} format - Book format
 * @returns {Promise<boolean>} - Success status
 */
export const deleteBook = async (id, format) => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BOOK_STORE], 'readwrite');
      const store = transaction.objectStore(BOOK_STORE);
      
      const request = store.delete(`${id}_${format}`);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('Error deleting book:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to delete book:', error);
    return false;
  }
};

/**
 * Get list of all downloaded books
 * @returns {Promise<Array>} - List of book IDs and formats
 */
export const listDownloadedBooks = async () => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BOOK_STORE, METADATA_STORE], 'readonly');
      const bookStore = transaction.objectStore(BOOK_STORE);
      const metaStore = transaction.objectStore(METADATA_STORE);
      
      const books = [];
      
      bookStore.openCursor().onsuccess = async (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const bookId = cursor.value.bookId;
          
          // Get metadata for this book
          try {
            const metadata = await new Promise((metaResolve) => {
              const metaRequest = metaStore.get(bookId);
              metaRequest.onsuccess = () => metaResolve(metaRequest.result || {});
              metaRequest.onerror = () => metaResolve({});
            });
            
            books.push({
              id: bookId,
              format: cursor.value.format,
              lastAccessed: cursor.value.lastAccessed,
              title: metadata.title || 'Unknown',
              author: metadata.author || 'Unknown',
              cover: metadata.cover || null
            });
          } catch (error) {
            console.error('Error getting metadata for book:', error);
          }
          
          cursor.continue();
        } else {
          resolve(books);
        }
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
      
      transaction.onerror = (event) => {
        console.error('Error listing books:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Failed to list books:', error);
    return [];
  }
};

/**
 * Clear storage for old/unused books
 * @param {number} maxBooks - Maximum number of books to keep
 * @returns {Promise<number>} - Number of books cleared
 */
export const cleanupStorage = async (maxBooks = 20) => {
  try {
    // Get list of all books sorted by last accessed (oldest first)
    const books = await listDownloadedBooks();
    books.sort((a, b) => new Date(a.lastAccessed) - new Date(b.lastAccessed));
    
    // If we're under the limit, no cleanup needed
    if (books.length <= maxBooks) {
      return 0;
    }
    
    // Delete oldest books to get back under the limit
    const booksToDelete = books.slice(0, books.length - maxBooks);
    
    let deletedCount = 0;
    for (const book of booksToDelete) {
      const success = await deleteBook(book.id, book.format);
      if (success) deletedCount++;
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Failed to cleanup storage:', error);
    return 0;
  }
};

/**
 * Main function to fetch a book and save it for offline reading
 * @param {string} id - Book ID
 * @param {string} format - Book format
 * @returns {Promise<string|null>} - URL to the book data
 */
export const downloadBook = async (id, format) => {
  // First check if we already have this book cached
  const cachedData = await getBookData(id, format);
  if (cachedData) {
    console.log(`Using cached book: ${id} (${format})`);
    return URL.createObjectURL(cachedData);
  }
  
  try {
    // Fetch book from API
    const response = await api.get(`/library/download/${id}/${format}`, {
      responseType: 'blob'
    });
    
    const bookData = response.data;
    
    // Save to IndexedDB for offline reading
    await saveBookData(id, format, bookData);
    
    // Run cleanup in the background to limit storage usage
    cleanupStorage().catch(console.error);
    
    return URL.createObjectURL(bookData);
  } catch (error) {
    console.error(`Failed to download book ${id} (${format}):`, error);
    return null;
  }
};

/**
 * Fetch book metadata from the API
 * @param {string} id - Book ID
 * @returns {Promise<Object|null>} - Book metadata
 */
export const fetchBook = async (id) => {
  // First check if we have the metadata cached
  const cachedMetadata = await getBookMetadata(id);
  if (cachedMetadata) {
    return cachedMetadata;
  }
  
  try {
    // Fetch from API
    const response = await api.get(`/library/book/${id}`);
    const metadata = response.data;
    
    // Save to IndexedDB
    await saveBookMetadata(metadata);
    
    return metadata;
  } catch (error) {
    console.error(`Failed to fetch book metadata for ${id}:`, error);
    return null;
  }
};