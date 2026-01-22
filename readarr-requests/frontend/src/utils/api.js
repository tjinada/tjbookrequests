// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token and app version to every request
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    // Add app version header so V3 backend can detect V2 clients
    config.headers['x-app-version'] = '2';
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Check for V3 upgrade signal in responses
api.interceptors.response.use(
  response => {
    // Check if V3 backend is telling us to upgrade
    if (response.headers['x-upgrade-required'] === 'true' || 
        (response.data && response.data._v3_upgrade_required)) {
      console.log('[V2] V3 upgrade signal received! Clearing caches...');
      
      // Clear all caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(reg => reg.unregister());
        });
      }
      
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    return response;
  },
  error => {
    // Also check error responses for upgrade signal
    if (error.response && 
        (error.response.headers['x-upgrade-required'] === 'true' ||
         (error.response.data && error.response.data._v3_upgrade_required))) {
      console.log('[V2] V3 upgrade signal received in error! Clearing caches...');
      
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(reg => reg.unregister());
        });
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    return Promise.reject(error);
  }
);

// Get user activities
export const getUserActivities = async (userId, limit = 50) => {
  try {
    const response = await api.get(`/admin/users/${userId}/activities?limit=${limit}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get user activity summary
export const getUserActivitySummary = async (userId) => {
  try {
    const response = await api.get(`/admin/users/${userId}/activity-summary`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get user activity metrics
export const getUserActivityMetrics = async () => {
  try {
    const response = await api.get('/admin/users/activity/metrics');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Reset user password
export const resetUserPassword = async (userId) => {
  try {
    const response = await api.put(`/admin/users/${userId}/reset-password`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Track reading activity
export const trackReadingActivity = async (bookId, page) => {
  try {
    const response = await api.post(`/reader/${bookId}/track`, { page });
    return response.data;
  } catch (error) {
    console.error('Error tracking reading activity:', error);
    // Don't throw, just log the error
    return null;
  }
};

export default api;