// src/pages/Profile.js
import React, { useContext, useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';
import NotificationPermissionButton from '../components/notifications/NotificationPermissionButton';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    // Validate passwords if user is trying to change password
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match');
        setLoading(false);
        return;
      }
      if (!formData.currentPassword) {
        setError('Current password is required to set a new password');
        setLoading(false);
        return;
      }
    }

    try {
      // Note: For simplicity, we're just showing a success message
      // In a real app, you'd implement a user profile update API endpoint

      // Simulating an API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For a real implementation, you'd do:
      // const response = await api.put('/api/users/profile', {
      //   username: formData.username,
      //   email: formData.email,
      //   currentPassword: formData.currentPassword,
      //   newPassword: formData.newPassword || undefined
      // });

      setSuccessMessage('Profile updated successfully!');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">Please log in to view your profile.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>

      <Paper elevation={3} sx={{ p: 4, mt: 4, maxWidth: 600, mx: 'auto' }}>
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            onClose={() => setSuccessMessage('')}
          >
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Change Password (optional)
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                error={formData.newPassword !== formData.confirmPassword && formData.confirmPassword !== ''}
                helperText={formData.newPassword !== formData.confirmPassword && formData.confirmPassword !== '' ? "Passwords don't match" : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 4, mt: 4, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Account Information
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">
            <strong>Role:</strong> {user.role === 'admin' ? 'Administrator' : 'User'}
          </Typography>
          <Typography variant="body1">
            <strong>Member Since:</strong> {new Date(user.createdAt || Date.now()).toLocaleDateString()}
          </Typography>
        </Box>
      </Paper>
      <Typography variant="h6" gutterBottom>
          Notifications
        </Typography>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, ml: 2 }}>
          <NotificationPermissionButton 
            variant="outlined" 
            size="small"
          />
      </Box>
    </Box>
  );
};

export default Profile;