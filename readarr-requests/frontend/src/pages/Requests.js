// src/pages/Requests.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Tooltip from '@mui/material/Tooltip';
import noImage from '../assets/no-image.png'; // You'll need this file
import api from '../utils/api';

const statusColors = {
  pending: 'warning',
  approved: 'info',
  denied: 'error',
  available: 'success'
};

const statusLabels = {
  pending: 'Pending Approval',
  approved: 'Approved - Processing',
  denied: 'Request Denied',
  available: 'Available in Library'
};

const RequestCard = ({ request }) => {
  return (
    <Card sx={{ display: 'flex', height: '100%' }}>
      <CardMedia
        component="img"
        sx={{ width: 120, objectFit: 'contain', p: 1 }}
        image={request.cover || noImage}
        alt={request.title}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <CardContent sx={{ flex: '1 0 auto' }}>
          <Typography component="div" variant="h6">
            {request.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" component="div">
            {request.author}
          </Typography>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Chip 
              label={statusLabels[request.status]} 
              color={statusColors[request.status]}
              size="small"
            />

            <Typography variant="caption" color="text.secondary">
              Requested: {new Date(request.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        </CardContent>
      </Box>
    </Card>
  );
};

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get('/requests/me');
        setRequests(res.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load your requests');
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

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
        <Alert severity="error" sx={{ mb: 2 }}>
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