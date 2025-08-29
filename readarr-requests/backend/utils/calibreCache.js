// utils/calibreCache.js
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '../cache/calibre');
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Generate cache key from request parameters
 */
function getCacheKey(query, options) {
  const keyObj = {
    query: query || '*',
    offset: options.offset || 0,
    limit: options.limit || 100,
    sort: options.sort || 'timestamp',
    sortOrder: options.sortOrder || 'desc'
  };
  
  // Create a hash-like key from the parameters
  return Buffer.from(JSON.stringify(keyObj)).toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .substring(0, 32); // Limit length
}

/**
 * Get cached data if available and not expired
 */
function getCache(key) {
  try {
    const cacheFile = path.join(CACHE_DIR, `${key}.json`);
    
    if (!fs.existsSync(cacheFile)) {
      return null;
    }
    
    const stats = fs.statSync(cacheFile);
    const now = Date.now();
    const fileAge = now - stats.mtimeMs;
    
    // Check if cache is expired
    if (fileAge > CACHE_TTL) {
      // Delete expired cache
      fs.unlinkSync(cacheFile);
      return null;
    }
    
    const data = fs.readFileSync(cacheFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Save data to cache
 */
function setCache(key, data) {
  try {
    const cacheFile = path.join(CACHE_DIR, `${key}.json`);
    fs.writeFileSync(cacheFile, JSON.stringify(data), 'utf8');
    return true;
  } catch (error) {
    console.error('Cache write error:', error);
    return false;
  }
}

/**
 * Clear all cache files
 */
function clearCache() {
  try {
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
    }
    console.log('Calibre cache cleared');
    return true;
  } catch (error) {
    console.error('Cache clear error:', error);
    return false;
  }
}

/**
 * Clear expired cache files
 */
function clearExpiredCache() {
  try {
    const now = Date.now();
    const files = fs.readdirSync(CACHE_DIR);
    let cleared = 0;
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(CACHE_DIR, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > CACHE_TTL) {
          fs.unlinkSync(filePath);
          cleared++;
        }
      }
    }
    
    if (cleared > 0) {
      console.log(`Cleared ${cleared} expired cache files`);
    }
    return true;
  } catch (error) {
    console.error('Clear expired cache error:', error);
    return false;
  }
}

module.exports = {
  getCacheKey,
  getCache,
  setCache,
  clearCache,
  clearExpiredCache
};
