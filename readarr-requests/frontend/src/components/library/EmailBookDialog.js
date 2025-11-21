// src/components/library/EmailBookDialog.js
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EmailIcon from '@mui/icons-material/Email';
import api from '../../utils/api';

const EmailBookDialog = ({ open, onClose, book }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    let sendToEmail = email;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/library/send-to-device', {
        bookId: book.id,
        deviceType: 'other', // Always use 'other' for now (EPUB format)
        email: sendToEmail
      });

      setSuccess(response.data.message || `Book sent successfully to ${sendToEmail}`);
      setLoading(false);
      
      // Close dialog after success (with delay to show success message)
      setTimeout(() => {
        onClose();
        // Reset state
        setEmail('');
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send book. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={!loading ? onClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Send Book by Email
      </DialogTitle>

      <DialogContent>
        {book && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">{book.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              by {book.author}
            </Typography>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <EmailIcon sx={{ mr: 1 }} />
            <Typography variant="subtitle1">
              Send to Email (ex: Kindle)
            </Typography>
          </Box>

          <TextField
            label="Email Address"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            margin="normal"
            placeholder="your_address@example.com"
            helperText="Enter the email address to send the book to"
            disabled={loading}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          onClick={handleSubmit}
          disabled={loading || !email.trim()}
        >
          {loading ? 'Sending...' : 'Send Book'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailBookDialog;