// src/pages/BookDetail.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import noImage from '../assets/no-image.png';
import api from '../utils/api';
import EmailBookDialog from '../components/library/EmailBookDialog';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Fetch book details on component mount
  useEffect(() => {
    const fetchBookDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/library/book/${id}`);
        setBook(response.data);
      } catch (err) {
        console.error('Error fetching book details:', err);
        setError(err.response?.data?.message || 'Failed to load book details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBookDetails();
    }
  }, [id]);

  const handleDownload = () => {
    // Use EPUB format if available, otherwise use the first available format
    let downloadFormat = 'EPUB';
    if (book && book.formats) {
      if (!book.formats.includes('EPUB') && book.formats.length > 0) {
        downloadFormat = book.formats[0];
      }
    }
    
    const downloadUrl = `/api/library/download/${id}/${downloadFormat}`;
    window.open(downloadUrl, '_blank');
  };

  const handleReadOnline = () => {
    navigate(`/read/${id}/EPUB`);
  };

  const handleEmailClick = () => {
    setEmailDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/library')}
          sx={{ mt: 2 }}
        >
          Back to Library
        </Button>
      </Box>
    );
  }

  if (!book) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Book not found</Alert>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/library')}
          sx={{ mt: 2 }}
        >
          Back to Library
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumb navigation */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link 
          component={RouterLink} 
          to="/"
          underline="hover"
          color="inherit"
        >
          Home
        </Link>
        <Link 
          component={RouterLink} 
          to="/library"
          underline="hover"
          color="inherit"
        >
          <LibraryBooksIcon sx={{ mr: 0.5, fontSize: '0.8rem', verticalAlign: 'middle' }} />
          Library
        </Link>
        <Typography color="text.primary">
          {book.title}
        </Typography>
      </Breadcrumbs>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Book cover */}
          <Grid item xs={12} sm={4} md={3}>
            <Box 
              component="img" 
              src={book.cover || noImage} 
              alt={book.title}
              sx={{ 
                width: '100%',
                borderRadius: 1,
                boxShadow: 3,
                maxHeight: { xs: 300, sm: 400 },
                objectFit: 'contain'
              }}
            />
            
            {/* Action buttons for small screens */}
            <Box sx={{ mt: 2, display: { sm: 'none' } }}>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Button 
                    fullWidth
                    variant="contained" 
                    color="primary" 
                    startIcon={<MenuBookIcon />}
                    onClick={handleReadOnline}
                  >
                    Read
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button 
                    fullWidth
                    variant="outlined" 
                    color="primary" 
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                  >
                    Download
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <Button 
                    fullWidth
                    variant="outlined" 
                    color="primary" 
                    startIcon={<EmailIcon />}
                    onClick={handleEmailClick}
                  >
                    Email
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Book details */}
          <Grid item xs={12} sm={8} md={9}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h4" component="h1" gutterBottom>
                  {book.title}
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  by {book.author}
                </Typography>
              </Box>
              
              {/* Action buttons for larger screens */}
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<MenuBookIcon />}
                  onClick={handleReadOnline}
                >
                  Read
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                >
                  Download
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  startIcon={<EmailIcon />}
                  onClick={handleEmailClick}
                >
                  Email
                </Button>
              </Box>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Book metadata */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {book.publisher && (
                <Grid item xs={6} sm={4}>
                  <Typography variant="subtitle2">Publisher</Typography>
                  <Typography variant="body2">{book.publisher}</Typography>
                </Grid>
              )}
              
              {book.added && (
                <Grid item xs={6} sm={4}>
                  <Typography variant="subtitle2">Added to Library</Typography>
                  <Typography variant="body2">
                    {new Date(book.added).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}
              
              {book.formats && book.formats.length > 0 && (
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2">Available Formats</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {book.formats.map(format => (
                      <Chip 
                        key={format} 
                        label={format}
                        size="small"
                        color={format === 'EPUB' ? 'primary' : 'default'}
                      />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
            
            {/* Book description */}
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            {book.comments ? (
              <div dangerouslySetInnerHTML={{ __html: book.comments }} />
            ) : (
              <Typography variant="body1" color="text.secondary">
                No description available for this book.
              </Typography>
            )}
            
{/* Tags section removed as requested */}
          </Grid>
        </Grid>
      </Paper>
      
      <EmailBookDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        book={book}
      />
    </Box>
  );
};

export default BookDetail;