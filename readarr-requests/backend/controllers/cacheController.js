// controllers/cacheController.js
const openLibraryAPI = require('../config/openLibrary');
// Import googleBooksAPI if you're using it
// const googleBooksAPI = require('../config/googleBooks');

// Purge all caches
exports.purgeAllCaches = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to purge cache' });
    }

    // Purge OpenLibrary cache
    openLibraryAPI.purgeCache();

    // Purge Google Books cache if using it
    // googleBooksAPI.purgeCache();

    // Return success
    return res.json({ 
      success: true, 
      message: 'All caches successfully purged. New data will be fetched on next request.' 
    });
  } catch (error) {
    console.error('Error purging caches:', error);
    return res.status(500).json({ message: 'Error purging caches' });
  }
};