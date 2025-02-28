// src/components/books/BookRequestDialog.js
import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../../utils/api';

const BookRequestDialog = ({ open, onClose, book }) => {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState(null);

  const handleRequestBook = async () => {
    setRequesting(true);
    setError(null);

    try {
      await api.post('/api/requests', {
        bookId: book.id,
        title: book.title,
        author: book.author,
        cover: book.cover,
        isbn: book.isbn
      });

      setRequested(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request book. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const handleClose = () => {
    // Reset state when dialog closes
    if (requested) {
      setTimeout(() => {
        setRequested(false);
        setError(null);
      }, 300);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={requesting ? undefined : handleClose}
      aria-labelledby="request-dialog-title"
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="request-dialog-title">
        Request Book
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          {book.cover && (
            <Box
              component="img"
              src={book.cover}
              alt={book.title}
              sx={{ 
                width: 80, 
                mr: 2, 
                borderRadius: 1,
                objectFit: 'contain'
              }}
            />
          )}
          <Box>
            <Typography variant="h6" component="div">
              {book.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              by {book.author}
            </Typography>
          </Box>
        </Box>

        <DialogContentText>
          Do you want to request this book to be added to the library?
        </DialogContentText>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {requested && (
          <Alert 
            icon={<CheckCircleIcon fontSize="inherit" />} 
            severity="success" 
            sx={{ mt: 2 }}
          >
            Book successfully requested!
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={requesting}>
          {requested ? 'Close' : 'Cancel'}
        </Button>
        {!requested && (
          <Button 
            onClick={handleRequestBook} 
            disabled={requesting}
            variant="contained" 
            startIcon={requesting ? <CircularProgress size={20} /> : <BookmarkAddIcon />}
          >
            {requesting ? 'Requesting...' : 'Request Book'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BookRequestDialog;