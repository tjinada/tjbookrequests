// src/components/admin/CalibreMatcher.js
import React, { useState } from 'react';
import {
  Button,
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import api from '../../utils/api';

/**
 * Component to match pending requests with books already in Calibre
 */
const CalibreMatcher = ({ onMatchingCompleted }) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);

  // Handle checking for matches
  const handleCheckMatches = () => {
    setConfirmDialog(true);
  };

  const handleDialogClose = () => {
    setConfirmDialog(false);
  };

  // Confirm and check for matches
  const handleConfirmCheck = async () => {
    setConfirmDialog(false);
    setChecking(true);
    setResult(null);
    setError(null);

    try {
      const response = await api.post('/requests/calibre-match');
      setResult(response.data);
      
      // Call the callback if provided
      if (onMatchingCompleted && typeof onMatchingCompleted === 'function') {
        onMatchingCompleted();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check for Calibre matches');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Match Requests with Calibre Library
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Checks if requested books already exist in your Calibre library and links them
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleCheckMatches}
            disabled={checking}
            startIcon={checking ? <CircularProgress size={20} /> : <LibraryBooksIcon />}
          >
            {checking ? 'Checking...' : 'Find Matches'}
          </Button>
        </Box>
        
        {checking && (
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              Checking Calibre library for matching books...
            </Typography>
          </Box>
        )}

        {result && (
          <Alert 
            severity="info" 
            sx={{ mt: 2 }}
          >
            <Typography variant="body2">
              {result.message}
              {result.matchedCount > 0 && ' Refresh page to see updates.'}
            </Typography>
            
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Results:
              </Typography>
              <Typography variant="body2">
                • Requests checked: {result.totalChecked}
              </Typography>
              <Typography variant="body2">
                • Matched in Calibre: {result.matchedCount}
              </Typography>
              <Typography variant="body2">
                • Auto-approved: {result.approvedCount}
              </Typography>
            </Box>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmDialog}
          onClose={handleDialogClose}
          aria-labelledby="calibre-match-dialog-title"
        >
          <DialogTitle id="calibre-match-dialog-title">
            Check for Matching Books
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will check all pending requests against your Calibre library to see if the books already exist.
              If matches are found, users can be granted access to existing books instead of downloading new copies.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button onClick={handleConfirmCheck} color="primary" autoFocus>
              Proceed
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default CalibreMatcher;