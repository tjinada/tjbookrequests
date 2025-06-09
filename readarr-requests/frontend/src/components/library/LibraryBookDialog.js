// src/components/library/LibraryBookDialog.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LibraryContext from '../../context/LibraryContext';
import DeleteBookDialog from './DeleteBookDialog';
import noImage from '../../assets/no-image.png';

const LibraryBookDialog = ({ open, onClose, book, onEmailClick }) => {
  const navigate = useNavigate();
  const { deleteBookFromLibrary, toggleBookReadStatus, isBookRead } = useContext(LibraryContext);
  
  // State for delete functionality
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // State for read status functionality
  const [readLoading, setReadLoading] = useState(false);
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Check if book has the necessary data
  if (!book) return null;
  
  // Get current read status
  const bookIsRead = isBookRead(book);

  // Handle Read button click
  const handleReadClick = () => {
    onClose();
    navigate(`/read/${book.id}/EPUB`);
  };

  // Handle Download button click
  const handleDownloadClick = () => {
    // Use EPUB format if available, otherwise use the first available format
    let downloadFormat = 'EPUB';
    if (book.formats) {
      if (!book.formats.includes('EPUB') && book.formats.length > 0) {
        downloadFormat = book.formats[0];
      }
    }
    
    const downloadUrl = `/api/library/download/${book.id}/${downloadFormat}`;
    window.open(downloadUrl, '_blank');
  };

  // Handle Email button click
  const handleEmailClick = () => {
    onClose();
    if (onEmailClick) {
      onEmailClick(book);
    }
  };
  
  // Handle Delete button click
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    
    try {
      const result = await deleteBookFromLibrary(book.id);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'success'
        });
        
        // Close both dialogs after successful deletion
        setTimeout(() => {
          setDeleteDialogOpen(false);
          onClose();
        }, 1000);
      } else {
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'An error occurred while removing the book',
        severity: 'error'
      });
    } finally {
      setDeleteLoading(false);
    }
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Handle Mark as Read toggle
  const handleToggleReadStatus = async () => {
    setReadLoading(true);
    
    try {
      const result = await toggleBookReadStatus(book.id, !bookIsRead);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'success'
        });
        
        // If marking as read, close dialog and return to library
        if (result.isRead) {
          setTimeout(() => {
            onClose();
          }, 1000); // Give user time to see the success message
        }
      } else {
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'An error occurred while updating read status',
        severity: 'error'
      });
    } finally {
      setReadLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 2,
          backgroundColor: theme => theme.palette.mode === 'dark' ? '#1a1a1a' : '#fff'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          textAlign: 'center', 
          fontWeight: 'bold',
          pb: 1
        }}
      >
        Book Details
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Top action - Read Book button */}
        <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<MenuBookIcon />}
            onClick={handleReadClick}
            size="large"
            sx={{ py: 1.5, borderRadius: 2 }}
          >
            Read Book
          </Button>
        </Box>
        
        {/* Mark as Read button */}
        <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant={bookIsRead ? "contained" : "outlined"}
            color={bookIsRead ? "success" : "inherit"}
            fullWidth
            startIcon={bookIsRead ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
            onClick={handleToggleReadStatus}
            disabled={readLoading}
            size="large"
            sx={{ 
              py: 1.5, 
              borderRadius: 2,
              backgroundColor: bookIsRead ? 'success.main' : 'transparent',
              '&:hover': {
                backgroundColor: bookIsRead ? 'success.dark' : 'rgba(0,0,0,0.04)'
              }
            }}
          >
            {readLoading ? 'Updating...' : (bookIsRead ? 'Mark as Unread' : 'Mark as Read')}
          </Button>
        </Box>

        {/* Book information section */}
        <Box sx={{ px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            {/* Book cover */}
            <Box
              component="img"
              src={book.cover || noImage}
              alt={book.title}
              sx={{
                width: 110,
                height: 160,
                objectFit: 'cover',
                objectPosition: 'center top',
                borderRadius: 2,
                border: '1px solid rgba(0,0,0,0.1)'
              }}
            />

            {/* Book metadata */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" component="h2" gutterBottom>
                {book.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                by {book.author}
              </Typography>
              
              {book.publisher && (
                <Typography variant="body2" color="text.secondary">
                  Published: {book.publisher} {book.year && `(${book.year})`}
                </Typography>
              )}

              {book.formats && book.formats.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {book.formats.map(format => (
                    <Chip
                      key={format}
                      label={format}
                      size="small"
                      color={format === 'EPUB' ? 'primary' : 'default'}
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* ISBN if available */}
          {book.isbn && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ISBN: {book.isbn}
            </Typography>
          )}

          {/* Description section */}
          {(book.comments || book.overview || book.description) && (
            <>
              <Divider textAlign="center" sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                  Description
                </Typography>
              </Divider>
              
              <Typography
                variant="body2"
                component="div"
                sx={{
                  maxHeight: 150,
                  overflow: 'auto',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  px: 1
                }}
                dangerouslySetInnerHTML={{
                  __html: book.comments || book.overview || book.description
                }}
              />
            </>
          )}
        </Box>

        {/* Bottom actions - Download, Email, and Delete */}
        <Box 
          sx={{ 
            display: 'flex', 
            mt: 2, 
            borderTop: '1px solid', 
            borderColor: 'divider',
            backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
          }}
        >
          <Button
            color="inherit"
            onClick={handleDownloadClick}
            sx={{ 
              flex: 1, 
              py: 2,
              borderRadius: 0,
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.05)'
              }
            }}
            startIcon={<DownloadIcon />}
          >
            Download
          </Button>
          
          <Divider orientation="vertical" flexItem />
          
          <Button
            color="inherit"
            onClick={handleEmailClick}
            sx={{ 
              flex: 1, 
              py: 2,
              borderRadius: 0,
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.05)'
              }
            }}
            startIcon={<EmailIcon />}
          >
            Email
          </Button>
          
          <Divider orientation="vertical" flexItem />
          
          <Button
            color="inherit"
            onClick={handleDeleteClick}
            sx={{ 
              flex: 1, 
              py: 2,
              borderRadius: 0,
              '&:hover': {
                backgroundColor: 'rgba(255,0,0,0.05)',
                color: 'error.main'
              }
            }}
            startIcon={<DeleteIcon />}
          >
            Remove
          </Button>
        </Box>

        {/* Cancel button (as a faux bottom navigation) */}
        <Box 
          sx={{ 
            borderTop: '1px solid', 
            borderColor: 'divider',
            p: 1.5,
            textAlign: 'center',
            bgcolor: theme => theme.palette.mode === 'dark' ? '#111' : '#f5f5f5'
          }}
        >
          <Button 
            onClick={onClose}
            variant="text"
            color="inherit"
          >
            Cancel
          </Button>
        </Box>
      </DialogContent>
      
      {/* Delete Confirmation Dialog */}
      <DeleteBookDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        book={book}
        loading={deleteLoading}
      />
      
      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default LibraryBookDialog;