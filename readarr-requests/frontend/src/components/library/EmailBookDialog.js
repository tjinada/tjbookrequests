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
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EmailIcon from '@mui/icons-material/Email';
import DevicesIcon from '@mui/icons-material/Devices';
import api from '../../utils/api';

const EmailBookDialog = ({ open, onClose, book }) => {
  const [emailType, setEmailType] = useState('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Handle email type change (kindle vs regular email)
  const handleEmailTypeChange = (event) => {
    setEmailType(event.target.value);
    setEmail(''); // Clear email when changing type
  };

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

    // For Kindle, check if it's a kindle.com address or append it
    let sendToEmail = email;
    if (emailType === 'kindle' && !email.endsWith('kindle.com') && !email.endsWith('@kindle.com')) {
      // Check if it contains @ already
      if (email.includes('@')) {
        setError('For Kindle delivery, please use a kindle.com email address');
        return;
      }
      sendToEmail = `${email}@kindle.com`;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/library/send-to-device', {
        bookId: book.id,
        deviceType: emailType === 'kindle' ? 'kindle' : 'other',
        email: sendToEmail
      });

      setSuccess(response.data.message || `Book sent successfully to ${sendToEmail}`);
      setLoading(false);
      
      // Close dialog after success (with delay to show success message)
      setTimeout(() => {
        onClose();
        // Reset state
        setEmail('');
        setEmailType('email');
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
          <Typography variant="subtitle1" gutterBottom>
            Where would you like to send this book?
          </Typography>

          <RadioGroup
            value={emailType}
            onChange={handleEmailTypeChange}
            sx={{ mb: 2 }}
          >
            <FormControlLabel 
              value="email" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EmailIcon sx={{ mr: 1 }} />
                  <Typography>Send to Email (EPUB format)</Typography>
                </Box>
              } 
            />
            <FormControlLabel 
              value="kindle" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DevicesIcon sx={{ mr: 1 }} />
                  <Typography>Send to Kindle (MOBI format)</Typography>
                </Box>
              } 
            />
          </RadioGroup>

          <TextField
            label={emailType === 'kindle' ? "Kindle Email Address" : "Email Address"}
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            margin="normal"
            placeholder={emailType === 'kindle' ? "your_address or your_address@kindle.com" : "your_address@example.com"}
            helperText={emailType === 'kindle' ? "Enter just the username or complete kindle.com address" : "Enter the email address to send the book to"}
            disabled={loading}
            InputProps={{
              endAdornment: emailType === 'kindle' && !email.includes('@') ? (
                <Typography variant="body2" color="text.secondary">
                  @kindle.com
                </Typography>
              ) : null,
            }}
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