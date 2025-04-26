// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to every request if it exists
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  error => {
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