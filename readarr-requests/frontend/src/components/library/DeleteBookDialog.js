// src/components/library/DeleteBookDialog.js
import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Box,
  Typography
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

const DeleteBookDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  book, 
  loading = false 
}) => {
  if (!book) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="delete-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography component="span">
            Remove Book from Library
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <DialogContentText id="delete-dialog-description">
          Are you sure you want to remove "{book.title}" by {book.author} from your library?
        </DialogContentText>
        
        <DialogContentText sx={{ mt: 2, fontStyle: 'italic' }}>
          This will remove the book from your personal library view. The book will still be available 
          in the system for other users.
        </DialogContentText>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          color="error" 
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Removing...' : 'Remove Book'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteBookDialog;
