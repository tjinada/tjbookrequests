// src/components/books/BookRequestDialog.js
import React, { useState, useEffect, useContext } from 'react';
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
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AuthContext from '../../context/AuthContext';
import api from '../../utils/api';
import noImage from '../../assets/no-image.png';

// Function to get the best available image from a book object
const getBestCoverImage = (book) => {
  if (!book) return null;
  
  // First check if imageLinks exists and has thumbnails (Google Books API)
  if (book.imageLinks) {
    // Try to get the largest available image in descending order of quality
    return book.imageLinks.extraLarge || 
           book.imageLinks.large || 
           book.imageLinks.medium || 
           book.imageLinks.small || 
           book.imageLinks.thumbnail;
  }
  
  // Fallback to cover property if imageLinks is not available
  return book.cover || null;
};

const BookRequestDialog = ({ open, onClose, book }) => {
  const { user } = useContext(AuthContext);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState(null);
  const [authorInfo, setAuthorInfo] = useState(null);
  const [loadingAuthor, setLoadingAuthor] = useState(false);

  const isAdmin = user && user.role === 'admin';

  // Reset state when dialog opens
  useEffect(() => {
    if (open && book) {
      setRequested(false);
      setError(null);
      setAuthorInfo(null);
      
      // Get author information if available
      if (book.author && book.source === 'google') {
        loadAuthorInfo(book.author);
      }
    }
  }, [open, book]);

  // Load author information
  const loadAuthorInfo = async (authorName) => {
    try {
      setLoadingAuthor(true);
      const response = await api.get('/search/author/info', {
        params: {
          name: authorName,
          source: book.source || 'google'
        }
      });
      
      if (response.data) {
        setAuthorInfo(response.data);
      }
    } catch (err) {
      console.error('Error loading author info:', err);
    } finally {
      setLoadingAuthor(false);
    }
  };

  const handleRequestBook = async () => {
    setRequesting(true);
    setError(null);

    try {
      // Get the best cover image URL 
      const coverImageUrl = getBestCoverImage(book);

      await api.post('/requests', {
        bookId: book.id,
        title: book.title,
        author: book.author,
        cover: coverImageUrl,
        isbn: book.isbn,
        source: book.source || 'google' // Ensure source is passed 
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
        setAuthorInfo(null);
      }, 300);
    }
    onClose();
  };

  if (!book) return null;

  // Get the best image for display
  const coverImageUrl = getBestCoverImage(book);

  return (
    <Dialog
      open={open}
      onClose={requesting ? undefined : handleClose}
      aria-labelledby="request-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="request-dialog-title">
        Request Book
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Box
            component="img"
            src={coverImageUrl || noImage}
            alt={book.title}
            sx={{ 
              width: 120, 
              height: 180,
              mr: 2, 
              borderRadius: 1,
              objectFit: 'cover',
              objectPosition: 'center top',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
              },
              imageRendering: 'high-quality'
            }}
          />
          <Box>
            <Typography variant="h6" component="div">
              {book.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              by {book.author}
            </Typography>
            
            {book.year && (
              <Typography variant="body2" color="text.secondary">
                Published: {book.year}
              </Typography>
            )}
            
            {book.source && (
              <Chip 
                label={book.source === 'google' ? 'Google Books' : 'Open Library'} 
                size="small" 
                sx={{ mt: 1 }}
              />
            )}

            {book.isbn && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                ISBN: {book.isbn}
              </Typography>
            )}
          </Box>
        </Box>
        
        {/* Author Info Section */}
        {loadingAuthor ? (
          <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="body2">Loading author information...</Typography>
          </Box>
        ) : authorInfo ? (
          <Box sx={{ my: 2 }}>
            <Divider sx={{ mb: 1 }}>
              <Chip label="Author Info" size="small" />
            </Divider>
            <Typography variant="body2">
              <strong>{authorInfo.name}</strong> has {authorInfo.bookCount} books in our database
              {authorInfo.primaryGenres?.length > 0 && (
                <> with genres including: {authorInfo.primaryGenres.join(', ')}</>
              )}.
            </Typography>
          </Box>
        ) : null}

        {/* Book description if available */}
        {book.overview && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Divider sx={{ mb: 1 }}>
              <Chip label="Description" size="small" />
            </Divider>
            <Typography 
              variant="body2" 
              sx={{ 
                maxHeight: 150, 
                overflow: 'auto',
                fontSize: '0.85rem',
                lineHeight: 1.5
              }}
              dangerouslySetInnerHTML={{ __html: book.overview }}
            />
          </Box>
        )}

        <DialogContentText sx={{ mt: 2 }}>
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