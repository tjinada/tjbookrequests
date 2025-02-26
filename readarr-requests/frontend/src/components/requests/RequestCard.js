// src/components/requests/RequestCard.js
import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import noImage from '../../assets/no-image.png'; // Make sure this path is correct

const statusColors = {
  pending: 'warning',
  approved: 'info',
  denied: 'error',
  available: 'success'
};

const RequestCard = ({ request }) => {
  // Define status messages
  const statusMessages = {
    pending: 'Awaiting approval',
    approved: request.readarrStatus === 'added' ? 'Added to Readarr - Searching' : 'Approved',
    denied: 'Request denied',
    available: 'Available in library'
  };

  // Determine if there's a Readarr error to show
  const hasReadarrError = request.readarrStatus === 'error' && request.readarrMessage;

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
              label={statusMessages[request.status] || request.status} 
              color={statusColors[request.status]}
              size="small"
            />

            <Typography variant="caption" color="text.secondary">
              {new Date(request.createdAt).toLocaleDateString()}
            </Typography>
          </Box>

          {hasReadarrError && (
            <Typography 
              variant="caption" 
              color="error" 
              sx={{ display: 'block', mt: 1 }}
            >
              {request.readarrMessage}
            </Typography>
          )}

          {request.status === 'available' && (
            <Typography 
              variant="body2" 
              color="success.main" 
              sx={{ mt: 1 }}
            >
              Ready to read!
            </Typography>
          )}
        </CardContent>
      </Box>
    </Card>
  );
};

export default RequestCard;