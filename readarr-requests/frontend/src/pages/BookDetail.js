// src/pages/BookDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import noImage from '../assets/no-image.png'; // You'll need this file
import api from '../utils/api';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestError, setRequestError] = useState(null);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        const res = await api.get(`/books/${id}`);
        setBook(res.data);

        // Check if book is already requested
        try {
          const requestRes = await api.get('/requests/me');
          const isRequested = requestRes.data.some(
            request => request.bookId === id
          );
          setRequested(isRequested);
        } catch (reqErr) {
          console.error('Error checking request status:', reqErr);
        }

        setLoading(false);
      } catch (err) {
        setError('Failed to load book details');
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [id]);

  const handleRequestBook = async () => {
    setRequesting(true);
    setRequestError(null);

    try {
      await api.post('/requests', {
        bookId: book.id,
        title: book.title,
        author: book.author,
        cover: book.cover,
        isbn: book.isbn // Add ISBN to the request
      });

      setRequested(true);
      setRequesting(false);
    } catch (err) {
      setRequestError(
        err.response?.data?.message || 'Failed to request book. Please try again.'
      );
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Go Back
      </Button>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Box
              component="img"
              sx={{
                width: '100%',
                maxHeight: 500,
                objectFit: 'contain',
                borderRadius: 1
              }}
              alt={book.title}
              src={book.cover || noImage}
            />
          </Grid>

          <Grid item xs={12} md={8}>
            <Typography variant="h4" component="h1" gutterBottom>
              {book.title}
            </Typography>

            <Typography variant="h6" gutterBottom>
              by {book.author}
            </Typography>

            {book.releaseDate && (
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Released: {new Date(book.releaseDate).toLocaleDateString()}
              </Typography>
            )}

            {book.genres && book.genres.length > 0 && (
              <Box sx={{ mt: 2, mb: 3 }}>
                {book.genres.map((genre) => (
                  <Chip 
                    key={genre} 
                    label={genre} 
                    size="small" 
                    sx={{ mr: 1, mb: 1 }} 
                  />
                ))}
              </Box>
            )}

            {book.overview && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Overview
                </Typography>
                <Typography variant="body1" paragraph>
                  {book.overview}
                </Typography>
              </Box>
            )}

            {requestError && (
              <Alert 
                severity="error" 
                sx={{ mt: 2, mb: 2 }}
                onClose={() => setRequestError(null)}
              >
                {requestError}
              </Alert>
            )}

            <Box sx={{ mt: 4 }}>
              {requested ? (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  disabled
                >
                  Requested
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<BookmarkAddIcon />}
                  onClick={handleRequestBook}
                  disabled={requesting}
                >
                  {requesting ? 'Requesting...' : 'Request Book'}
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default BookDetail;