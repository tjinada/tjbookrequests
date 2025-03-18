// src/utils/imageUtils.js
/**
 * Utility functions for handling image loading and fallbacks
 */

/**
 * Get a cover image URL with fallback to placeholder
 * @param {string} coverUrl - Original cover URL
 * @param {string} fallbackUrl - URL to use if coverUrl is empty/invalid
 * @returns {string} - The final URL to use
 */
export const getCoverImageUrl = (coverUrl, fallbackUrl = '/assets/images/default-cover.png') => {
    if (!coverUrl || coverUrl === 'N/A' || coverUrl === 'undefined') {
      return fallbackUrl;
    }
    return coverUrl;
  };
  
  /**
   * Handle image loading errors by replacing with a fallback
   * @param {Event} event - The error event
   * @param {string} fallbackUrl - URL to use when image fails to load
   */
  export const handleImageError = (event, fallbackUrl = '/assets/images/default-cover.png') => {
    event.target.src = fallbackUrl;
    event.target.onerror = null; // Prevent infinite error loop
  };
  
  /**
   * Check if an image URL is valid and can be loaded
   * @param {string} url - Image URL to check
   * @returns {Promise<boolean>} - Promise resolving to true if image is valid
   */
  export const isImageValid = async (url) => {
    if (!url) return false;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };