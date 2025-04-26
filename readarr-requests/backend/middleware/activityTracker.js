// middleware/activityTracker.js
/**
 * Middleware to track specific user activities
 * @param {string} activity - The type of activity to track
 * @param {function} detailsExtractor - Optional function to extract activity details from request
 * @returns {function} Express middleware function
 */
const trackActivity = (activity, detailsExtractor) => {
    return (req, res, next) => {
      // Skip if no user is authenticated
      if (!req.user) {
        return next();
      }
      
      // Set activity to track
      req.activityToTrack = activity;
      
      // Set activity details if a details extractor function is provided
      if (detailsExtractor && typeof detailsExtractor === 'function') {
        req.activityDetails = detailsExtractor(req);
      }
      
      next();
    };
  };
  
  module.exports = trackActivity;