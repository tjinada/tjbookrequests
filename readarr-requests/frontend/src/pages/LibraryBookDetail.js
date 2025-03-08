// src/pages/LibraryBookDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Container,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TabContext from '@mui/lab/TabContext';
import TabPanel from '@mui/lab/TabPanel';
import DeviceSelector from '../components/library/DeviceSelector';
import noImage from '../assets/no-image.png';
import api from '../utils/api';

// Format file size to human-readable
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const LibraryBookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [kindleEmail, setKindleEmail] = useState('');
  const [sendingToDevice, setSendingToDevice] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(null);
  const [sendError, setSendError] = useState(null);

  // Fetch book details
  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get(`/library/${id}`);
        setBook(response.data);
      } catch (err) {
        console.error('Error fetching book details:', err);
        setError('Failed to load book details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  // Handle back navigation
  const handleBack = () => {
    navigate('/library');
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle toggling favorite status
  const handleToggleFavorite = async () => {
    try {
      const newFavoriteStatus = !book.isFavorite;
      const response = await api.put(`/library/${id}`, {
        isFavorite: newFavoriteStatus
      });
      
      setBook({
        ...book,
        isFavorite: newFavoriteStatus
      });
    } catch (err) {
      console.error('Error updating favorite status:', err);
    }
  };

  // Handle download
  const handleDownload = () => {
    window.open(`/api/library/${id}/download`, '_blank');
  };

  // Handle read online
  const handleReadOnline = () => {
    navigate(`/library/${id}/read`);
  };

  // Handle Kindle email change
  const handleKindleEmailChange = (event) => {
    setKindleEmail(event.target.value);
  };

  // Handle send to Kindle
  const handleSendToKindle = async () => {
    if (!kindleEmail) return;
    
    try {
      setSendingToDevice(true);
      setSendSuccess(null);
      setSendError(null);
      
      const response = await api.post(`/library/${id}/send`, {
        deviceType: 'kindle',
        email: kindleEmail
      });
      
      setSendSuccess(response.data.message);
    } catch (err) {
      console.error('Error sending to Kindle:', err);
      setSendError(err.response?.data?.message || 'Failed to send to Kindle');
    } finally {
      setSendingToDevice(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Library
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!book) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Library
        </Button>
        <Alert severity="warning">Book not found</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleBack}
        sx={{ mb: 3 }}
      >
        Back to Library
      </Button>
      
      <Grid container spacing={4}>
        {/* Left Column - Book cover and action buttons */}
        <Grid item xs={12} md={4}>
          <Box sx={{ position: 'sticky', top: 100 }}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2, mb: 3 }}>
              <Box
                component="img"
                src={book.cover || noImage}
                alt={book.title}
                sx={{
                  width: '100%',
                  maxHeight: 400,
                  objectFit: 'contain',
                  borderRadius: 1,
                  mb: 2
                }}
              />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<MenuBookIcon />}
                  onClick={handleReadOnline}
                >
                  Read Online
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                >
                  Download ({book.fileFormat.toUpperCase()})
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<SendIcon />}
                  onClick={() => setActiveTab('send')}
                >
                  Send to Device
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth
                  color={book.isFavorite ? 'error' : 'primary'}
                  startIcon={book.isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  onClick={handleToggleFavorite}
                >
                  {book.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </Button>
              </Box>
            </Paper>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Added to Library: {new Date(book.addedAt).toLocaleDateString()}
            </Typography>
            
            {book.lastReadAt && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Last Read: {new Date(book.lastReadAt).toLocaleDateString()}
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">
              File Size: {formatFileSize(book.fileSize)}
            </Typography>
          </Box>
        </Grid>
        
        {/* Right Column - Book details and tabs */}
        <Grid item xs={12} md={8}>
          <Typography variant="h4" component="h1" gutterBottom>
            {book.title}
          </Typography>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            by {book.author}
          </Typography>
          
          <TabContext value={activeTab}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="book details tabs"
              >
                <Tab label="Information" value="info" />
                <Tab label="Send to Device" value="send" />
              </Tabs>
            </Box>
            
            <TabPanel value="info">
              {book.calibreDetails?.comments && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Description
                  </Typography>
                  <Typography 
                    variant="body1" 
                    paragraph
                    dangerouslySetInnerHTML={{ __html: book.calibreDetails.comments }}
                  />
                  <Divider sx={{ my: 3 }} />
                </Box>
              )}
              
              <Typography variant="h6" gutterBottom>
                Book Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Format:
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body2">
                    {book.fileFormat.toUpperCase()}
                  </Typography>
                </Grid>
                
                {book.calibreDetails?.languages && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Language:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {book.calibreDetails.languages.join(', ')}
                      </Typography>
                    </Grid>
                  </>
                )}
                
                {book.calibreDetails?.publisher && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Publisher:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {book.calibreDetails.publisher}
                      </Typography>
                    </Grid>
                  </>
                )}
                
                {book.calibreDetails?.pubdate && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Published:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {new Date(book.calibreDetails.pubdate).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  </>
                )}
                
                {book.calibreDetails?.tags && book.calibreDetails.tags.length > 0 && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Tags:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {book.calibreDetails.tags.join(', ')}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Reading Stats
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Read Count:
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body2">
                    {book.readCount} times
                  </Typography>
                </Grid>
                
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Last Read:
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body2">
                    {book.lastReadAt ? new Date(book.lastReadAt).toLocaleDateString() : 'Never'}
                  </Typography>
                </Grid>
              </Grid>
            </TabPanel>
            
            <TabPanel value="send">
              <Typography variant="h6" gutterBottom>
                Send to E-Reader
              </Typography>
              
              <Typography variant="body2" paragraph>
                Choose your device type and follow the instructions to send this book to your e-reader.
              </Typography>
              
              <DeviceSelector />
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Send to Kindle
              </Typography>
              
              <Typography variant="body2" paragraph>
                Enter your Kindle email address to send this book to your Kindle device.
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <TextField
                  label="Kindle Email"
                  variant="outlined"
                  value={kindleEmail}
                  onChange={handleKindleEmailChange}
                  placeholder="your-kindle@kindle.com"
                  fullWidth
                  sx={{ mr: 2 }}
                  disabled={sendingToDevice}
                />
                
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={handleSendToKindle}
                  disabled={!kindleEmail || sendingToDevice}
                >
                  {sendingToDevice ? 'Sending...' : 'Send'}
                </Button>
              </Box>
              
              {sendSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {sendSuccess}
                </Alert>
              )}
              
              {sendError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {sendError}
                </Alert>
              )}
              
              <Alert severity="info">
                Make sure to add the sender email to your approved senders list in your Amazon account.
              </Alert>
            </TabPanel>
          </TabContext>
        </Grid>
      </Grid>
    </Container>
  );
};

export default LibraryBookDetail;