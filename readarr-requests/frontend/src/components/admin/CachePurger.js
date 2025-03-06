// src/components/admin/CachePurger.js
import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import CachedIcon from '@mui/icons-material/Cached';
import api from '../../utils/api';

const CachePurger = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Open confirmation dialog
  const handleOpen = () => {
    setOpen(true);
    setResult(null);
    setError(null);
  };

  // Close dialog
  const handleClose = () => {
    setOpen(false);
  };

  // Purge cache
  const handlePurgeCache = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await api.post('/admin/purge-cache');
      setResult(response.data.message);

      // If callback provided, call it
      if (onSuccess && typeof onSuccess === 'function') {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      console.error('Error purging cache:', err);
      setError(err.response?.data?.message || 'Failed to purge cache');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        startIcon={<CachedIcon />}
        onClick={handleOpen}
        size="small"
      >
        Refresh Data
      </Button>

      <Dialog
        open={open}
        onClose={loading ? undefined : handleClose}
        aria-labelledby="cache-purge-dialog-title"
      >
        <DialogTitle id="cache-purge-dialog-title">
          Refresh Data Cache
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will clear all cached data and fetch fresh information from book APIs.
            Use this if you notice that the book listings are not showing the latest content.
          </DialogContentText>

          {loading && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress />
            </Box>
          )}

          {result && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {result}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleClose} 
            color="primary" 
            disabled={loading}
          >
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button 
              onClick={handlePurgeCache} 
              color="primary" 
              variant="contained"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CachePurger;