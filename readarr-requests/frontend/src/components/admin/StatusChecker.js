// src/components/admin/StatusChecker.js
import React, { useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import SyncIcon from '@mui/icons-material/Sync';
import InfoIcon from '@mui/icons-material/Info';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api from '../../utils/api';

const StatusChecker = ({ onStatusChecked }) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    setResult(null);
    setError(null);

    try {
      const response = await api.post('/requests/check-status');
      setResult(response.data);
      
      // Call the callback if provided
      if (onStatusChecked && typeof onStatusChecked === 'function') {
        onStatusChecked();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check request status');
    } finally {
      setChecking(false);
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  // Calculate statistics if we have results
  const stats = result ? {
    checkCount: result.updatedCount,
    metadataUpdated: result.metadataStats?.updated || 0,
    metadataFailed: result.metadataStats?.failed || 0,
    successRate: result.updatedCount > 0 
      ? Math.round((result.metadataStats?.updated || 0) / result.updatedCount * 100) 
      : 0
  } : null;

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Check Readarr Download Status
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Checks if requested books have been downloaded in Readarr and updates their status
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            onClick={checkStatus}
            disabled={checking}
            startIcon={checking ? <CircularProgress size={20} /> : <SyncIcon />}
          >
            {checking ? 'Checking Status...' : 'Update Book Status'}
          </Button>
        </Box>
        
        {checking && (
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              Checking Readarr for downloaded books...
            </Typography>
          </Box>
        )}

        {result && (
          <Alert 
            severity="info" 
            sx={{ mt: 2 }}
            action={
              <IconButton
                aria-label="show more"
                size="small"
                onClick={toggleDetails}
              >
                {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            }
          >
            <Typography variant="body2">
              {result.message}
              {result.updatedCount > 0 && ' Refresh page to see updates.'}
            </Typography>
            
            <Collapse in={showDetails}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Status Check Details:
                </Typography>
                <Typography variant="body2">
                  • Books checked: {stats.checkCount}
                </Typography>
                <Typography variant="body2">
                  • Metadata updates successful: {stats.metadataUpdated}
                </Typography>
                <Typography variant="body2">
                  • Metadata updates failed: {stats.metadataFailed}
                </Typography>
                {stats.checkCount > 0 && (
                  <Typography variant="body2">
                    • Success rate: {stats.successRate}%
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {!checking && !result && !error && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <InfoIcon color="info" sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              This process checks Readarr to see if books have been downloaded and updates their status.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default StatusChecker;