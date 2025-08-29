// utils/scheduler.js
let cron;
try {
  cron = require('node-cron');
} catch (err) {
  console.log('node-cron not installed, scheduled jobs will not run');
}

const cache = require('./calibreCache');

/**
 * Initialize scheduled tasks
 */
function initializeScheduledJobs() {
  if (!cron) {
    console.log('Scheduled jobs skipped - node-cron not available');
    return;
  }

  // Clear expired cache every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    console.log('Running scheduled cache cleanup...');
    cache.clearExpiredCache();
  });

  console.log('Scheduled jobs initialized');
}

module.exports = {
  initializeScheduledJobs
};
