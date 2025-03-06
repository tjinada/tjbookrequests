// src/pages/Requests.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Tooltip from '@mui/material/Tooltip';
import noImage from '../assets/no-image.png';
import api from '../utils/api';

// Import or define RequestCard component
import RequestCard from '../components/requests/RequestCard';

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch requests function using useCallback to avoid infinite loops
  const fetchRequests = useCallback(async () => {
    try {
      setError(null); // Clear previous errors
      const res = await api.get('/requests/me');
      console.log('Requests data:', res.data); // Add this for debugging
      setRequests(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching requests:', err); // Add detailed error logging
      setError('Failed to load your requests. Please try again.');
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Auto-refresh for approved requests
  useEffect(() => {
    // Only setup refresh if we have approved requests that aren't errored
    const hasApprovedRequests = requests.some(req => 
      req.status === 'approved' && req.readarrStatus !== 'error'
    );

    let refreshTimer;
    if (hasApprovedRequests) {
      refreshTimer = setInterval(() => {
        fetchRequests();
      }, 30000); // 30 seconds
    }

    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [requests, fetchRequests]);

  // Helper functions
  const handleRetry = () => {
    setLoading(true);
    fetchRequests();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Requests
        </Typography>

        <Box>
          <Tooltip title="What do the statuses mean?">
            <Button 
              startIcon={<HelpOutlineIcon />}
              sx={{ mr: 1 }}
            >
              Help
            </Button>
          </Tooltip>

          <Button 
            variant="contained" 
            component={Link} 
            to="/search" 
            startIcon={<SearchIcon />}
          >
            Find Books
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {requests.length > 0 ? (
        <Grid container spacing={3}>
          {requests.map((request) => (
            <Grid item xs={12} sm={6} md={4} key={request._id}>
              <RequestCard request={request} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            You haven't made any requests yet
          </Typography>
          <Typography variant="body1" paragraph>
            Search for books and request them to add to your library.
          </Typography>
          <Button 
            variant="contained" 
            component={Link} 
            to="/search" 
            startIcon={<SearchIcon />}
          >
            Search Books
          </Button>
        </Paper>
      )}

      <Box sx={{ mt: 4 }}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Request Status Legend:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip size="small" label="Pending Approval" color="warning" />
            <Chip size="small" label="Approved - Processing" color="info" />
            <Chip size="small" label="Available in Library" color="success" />
            <Chip size="small" label="Request Denied" color="error" />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Requests;