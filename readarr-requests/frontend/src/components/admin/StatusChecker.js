import React, { useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import SyncIcon from '@mui/icons-material/Sync';
import api from '../../utils/api';

const StatusChecker = () => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const checkStatus = async () => {
    setChecking(true);
    setResult(null);
    setError(null);

    try {
      const response = await api.post('/requests/check-status');
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check request status');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Button
        variant="outlined"
        color="primary"
        onClick={checkStatus}
        disabled={checking}
        startIcon={checking ? <CircularProgress size={20} /> : <SyncIcon />}
      >
        {checking ? 'Checking Status...' : 'Update Book Status'}
      </Button>

      {result && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {result.message}
          {result.updatedCount > 0 && ' Refresh page to see updates.'}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default StatusChecker;