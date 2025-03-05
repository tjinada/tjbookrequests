// src/components/notifications/NotificationSettings.js
import React, { useState } from 'react';
import { 
  Paper, 
  Typography, 
  Box,
  FormGroup,
  FormControlLabel,
  Switch,
  Button,
  Divider,
  Alert,
  Collapse
} from '@mui/material';
import NotificationManager from './NotificationManager';
import InfoIcon from '@mui/icons-material/Info';
import SaveIcon from '@mui/icons-material/Save';
import api from '../../utils/api';

const NotificationSettings = ({ user, onUpdate }) => {
  const [preferences, setPreferences] = useState(user.preferences?.notifications || {
    bookAvailable: true,
    newReleases: false,
    requestUpdates: true
  });
  
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleChange = (event) => {
    setPreferences({
      ...preferences,
      [event.target.name]: event.target.checked
    });
  };
  
  const savePreferences = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);
    
    try {
      // In a real app, you'd have an API endpoint to update preferences
      // For now, we'll just simulate success
      // const response = await api.put('/api/users/preferences', { notifications: preferences });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSuccess(true);
      
      // If we had a real API, we'd use the onUpdate callback to update the parent component's state
      if (onUpdate) {
        onUpdate({
          ...user,
          preferences: {
            ...user.preferences,
            notifications: preferences
          }
        });
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Failed to save notification preferences');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Notification Settings
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <NotificationManager />
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        Notification Preferences
      </Typography>
      
      <FormGroup>
        <FormControlLabel
          control={
            <Switch 
              checked={preferences.bookAvailable} 
              onChange={handleChange} 
              name="bookAvailable" 
              color="primary"
            />
          }
          label="Book Available Notifications"
        />
        <Typography variant="caption" color="textSecondary" sx={{ ml: 3, mb: 1 }}>
          Receive notifications when your requested books become available
        </Typography>
        
        <FormControlLabel
          control={
            <Switch 
              checked={preferences.requestUpdates} 
              onChange={handleChange} 
              name="requestUpdates" 
              color="primary"
            />
          }
          label="Request Status Updates"
        />
        <Typography variant="caption" color="textSecondary" sx={{ ml: 3, mb: 1 }}>
          Receive notifications when your request status changes (approved, denied, etc.)
        </Typography>
        
        <FormControlLabel
          control={
            <Switch 
              checked={preferences.newReleases} 
              onChange={handleChange} 
              name="newReleases" 
              color="primary"
            />
          }
          label="New Releases"
        />
        <Typography variant="caption" color="textSecondary" sx={{ ml: 3, mb: 2 }}>
          Receive notifications about new book releases from authors you've requested
        </Typography>
      </FormGroup>
      
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={savePreferences}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </Box>
      
      <Collapse in={success || error !== null}>
        <Box sx={{ mt: 2 }}>
          {success && (
            <Alert severity="success" onClose={() => setSuccess(false)}>
              Notification preferences saved successfully!
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Box>
      </Collapse>
      
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography 
          variant="body2" 
          color="textSecondary" 
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <InfoIcon fontSize="small" sx={{ mr: 1 }} />
          Notification settings apply to all your devices where you've enabled notifications for this site.
        </Typography>
      </Box>
    </Paper>
  );
};

export default NotificationSettings;