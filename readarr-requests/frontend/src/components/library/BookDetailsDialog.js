// src/components/library/BookDetailsDialog.js
import React, { useState, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Divider,
  IconButton,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Tooltip,
  Rating,
  Alert,
  Paper,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import DevicesIcon from '@mui/icons-material/Devices';
import ImportContactsIcon from '@mui/icons-material/ImportContacts';
import noImage from '../../assets/no-image.png';
import AuthContext from '../../context/AuthContext';
import api from '../../utils/api';

const BookDetailsDialog = ({ open, onClose, book }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useContext(AuthContext);
  
  // State for formats and options
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // State for e-reader sending
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendingToDevice, setSendingToDevice] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [deviceType, setDeviceType] = useState('kindle');
  const [sendSuccess, setSendSuccess] = useState(false);
  
  // Load available formats when dialog opens
  React.useEffect(() => {
    if (open && book?.id) {
      fetchFormats();
    }
  }, [open, book]);
  
  // Fetch available formats
  const fetchFormats = async () => {
    if (!book?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/library/book/${book.id}/formats`);
      
      // Process formats data
      const formatsList = response.data.availableFormats || [];
      setFormats(formatsList);
      
      // Set default selected format (prefer EPUB)
      if (formatsList.length > 0) {
        const epubFormat = formatsList.find(f => f.toUpperCase().includes('EPUB'));
        setSelectedFormat(epubFormat || formatsList[0]);
      }
    } catch (err) {
      console.error('Error fetching formats:', err);
      setError('Failed to load available formats');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle format selection change
  const handleFormatChange = (event) => {
    setSelectedFormat(event.target.value);
  };
  
  // Handle download button click
  const handleDownload = async () => {
    if (!selectedFormat) {
      setError('Please select a format first');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Extract format type (e.g., "EPUB" from "book.epub")
      const formatType = selectedFormat.split('.').pop().toUpperCase();
      
      // Get download link
      const response = await api.get(`/library/book/${book.id}/download/${formatType}`);
      
      if (response.data.downloadUrl) {
        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.setAttribute('download', `${book.title}.${formatType.toLowerCase()}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setSuccess(`${formatType} download started`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Download link not available');
      }
    } catch (err) {
      console.error('Error downloading book:', err);
      setError('Failed to download book');
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle send to e-reader form
  const toggleSendForm = () => {
    setShowSendForm(!showSendForm);
    // Reset form state when hiding
    if (showSendForm) {
      setSendSuccess(false);
    }
  };
  
  // Handle sending to e-reader
  const handleSendToEreader = async () => {
    if (!email) {
      setError('Email address is required');
      return;
    }
    
    try {
      setSendingToDevice(true);
      setError(null);
      
      const response = await api.post(`/library/book/${book.id}/send-to-ereader`, {
        email,
        deviceType
      });
      
      setSendSuccess(true);
      setSuccess(`Book sent to your ${deviceType === 'kindle' ? 'Kindle' : 'Kobo'} device`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error sending to e-reader:', err);
      setError('Failed to send book to your e-reader');
    } finally {
      setSendingToDevice(false);
    }
  };
  
  // Handle dialog close and reset state
  const handleClose = () => {
    onClose();
    setError(null);
    setSuccess(null);
    setShowSendForm(false);
    setSendSuccess(false);
  };
  
  if (!book) return null;
  
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="book-details-dialog-title"
    >
      <Box sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}>
        <IconButton onClick={handleClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </Box>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* Book cover */}
          <Grid item xs={12} sm={4} md={3}>
            <Box
              component="img"
              src={book.cover || noImage}
              alt={book.title}
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: 400,
                objectFit: 'contain',
                borderRadius: 2,
                boxShadow: 3
              }}
            />
            
            {/* Book rating */}
            {book.rating > 0 && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Rating value={book.rating} readOnly precision={0.5} />
              </Box>
            )}
          </Grid>
          
          {/* Book details */}
          <Grid item xs={12} sm={8} md={9}>
            <Typography variant="h4" component="h2" gutterBottom>
              {book.title}
            </Typography>
            
            <Typography variant="h6" color="text.secondary" gutterBottom>
              by {book.author}
            </Typography>
            
            {/* Tags */}
            {book.tags && book.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, my: 2 }}>
                {book.tags.map((tag, index) => (
                  <Chip
                    key={`${tag}-${index}`}
                    label={tag}
                    size="small"
                  />
                ))}
              </Box>
            )}
            
            <Divider sx={{ my: 2 }} />
            
            {/* Book description/comments */}
            {book.comments && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Description
                </Typography>
                <Typography
                  variant="body2"
                  component="div"
                  dangerouslySetInnerHTML={{ __html: book.comments }}
                  sx={{
                    mb: 2,
                    maxHeight: 200,
                    overflow: 'auto',
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider'
                  }}
                />
              </Box>
            )}
            
            {/* Download section */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Download Options
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                  <CircularProgress size={24} sx={{ mr: 2 }} />
                  <Typography>Loading formats...</Typography>
                </Box>
              ) : formats.length === 0 ? (
                <Alert severity="info">No formats available for download</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControl sx={{ minWidth: 120 }} size="small">
                      <InputLabel id="format-select-label">Format</InputLabel>
                      <Select
                        labelId="format-select-label"
                        value={selectedFormat}
                        label="Format"
                        onChange={handleFormatChange}
                      >
                        {formats.map((format, index) => {
                          // Extract format name (e.g., "EPUB" from "book.epub")
                          const formatName = format.split('.').pop().toUpperCase();
                          return (
                            <MenuItem key={`${format}-${index}`} value={format}>
                              {formatName}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                    
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={handleDownload}
                      disabled={!selectedFormat || loading}
                    >
                      Download
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<DevicesIcon />}
                      onClick={toggleSendForm}
                    >
                      Send to E-reader
                    </Button>
                  </Box>
                  
                  {/* Send to E-reader form */}
                  {showSendForm && (
                    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Send to E-reader
                      </Typography>
                      
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={5}>
                          <TextField
                            label="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth
                            size="small"
                            helperText="Your device's email address"
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Device Type</InputLabel>
                            <Select
                              value={deviceType}
                              label="Device Type"
                              onChange={(e) => setDeviceType(e.target.value)}
                            >
                              <MenuItem value="kindle">Kindle</MenuItem>
                              <MenuItem value="kobo">Kobo</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} sm={3}>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<SendIcon />}
                            onClick={handleSendToEreader}
                            disabled={sendingToDevice || !email}
                            fullWidth
                          >
                            {sendingToDevice ? 'Sending...' : 'Send'}
                          </Button>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            {deviceType === 'kindle' ? (
                              'Make sure to add noreply@your-domain.com to your Kindle approved senders.'
                            ) : (
                              'The book will be sent to your email for uploading to your Kobo device.'
                            )}
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      {sendSuccess && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                          Book sent successfully to your e-reader!
                        </Alert>
                      )}
                    </Paper>
                  )}
                </Box>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess(null)}>
                  {success}
                </Alert>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookDetailsDialog;