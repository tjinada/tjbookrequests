// src/components/library/BookReader.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Paper,
  Slider,
  Tooltip,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import BrightnessHighIcon from '@mui/icons-material/BrightnessHigh';
import BrightnessLowIcon from '@mui/icons-material/BrightnessLow';
import SettingsIcon from '@mui/icons-material/Settings';
import DownloadIcon from '@mui/icons-material/Download';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import api from '../../utils/api';

// Import the specialized reader components
import EpubReader from './EpubReader';
import PdfReader from './PdfReader';

const BookReader = () => {
  const { id, format = 'epub' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for reader
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [book, setBook] = useState(null);
  const [availableFormats, setAvailableFormats] = useState([]);
  const [currentFormat, setCurrentFormat] = useState(format.toLowerCase());
  
  // Reader settings
  const [fontSize, setFontSize] = useState(100); // percentage
  const [brightness, setBrightness] = useState(100); // percentage
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Content frame reference
  const readerContainerRef = useRef(null);
  
  // Load book data when component mounts
  useEffect(() => {
    if (!id) {
      setError('Book ID is required');
      setLoading(false);
      return;
    }
    
    // Function to load book data
    const loadBook = async () => {
      try {
        setLoading(true);
        // Get book details
        const bookResponse = await api.get(`/library/book/${id}`);
        setBook(bookResponse.data);
        
        // Get available formats
        const formatsResponse = await api.get(`/library/formats/${id}`);
        setAvailableFormats(formatsResponse.data.formats || []);
        
        // Set current format if available, otherwise use the first available format
        if (formatsResponse.data.formats && formatsResponse.data.formats.length > 0) {
          const lowerFormat = format.toLowerCase();
          if (formatsResponse.data.formats.some(fmt => fmt.toLowerCase() === lowerFormat)) {
            setCurrentFormat(lowerFormat);
          } else {
            setCurrentFormat(formatsResponse.data.formats[0].toLowerCase());
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading book:', err);
        if (err.response && err.response.status === 401) {
          setError('Authentication required. Please sign in again.');
          // Optionally redirect to login
          // navigate('/login');
        } else {
          setError('Failed to load book information. Please try again.');
        }
        setLoading(false);
      }
    };
    
    loadBook();
  }, [id, format, navigate]);
  
  // Change book format
  const changeFormat = (newFormat) => {
    if (newFormat === currentFormat) return;
    
    setCurrentFormat(newFormat);
    navigate(`/read/${id}/${newFormat}`);
  };
  
  // Toggle settings drawer
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };
  
  // Close reader and go back
  const handleClose = () => {
    navigate('/library');
  };
  
  // Update font size
  const handleFontSizeChange = (event, newValue) => {
    setFontSize(newValue);
  };
  
  // Update brightness
  const handleBrightnessChange = (event, newValue) => {
    setBrightness(newValue);
    
    // Apply brightness to reader container
    if (readerContainerRef.current) {
      readerContainerRef.current.style.filter = `brightness(${newValue}%)`;
    }
  };
  
  // Handle direct download
  const handleDownload = () => {
    // Create the download URL
    const downloadUrl = `/api/library/download/${id}/${currentFormat}`;
    
    // Use the api utility to get authenticated download
    api({
      url: downloadUrl,
      method: 'GET',
      responseType: 'blob',
      headers: {
        'x-auth-token': localStorage.getItem('token')
      }
    })
    .then(response => {
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename from Content-Disposition header if available
      const contentDisposition = response.headers['content-disposition'];
      let filename = `book.${currentFormat}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      } else if (book && book.title) {
        // Use book title as filename
        filename = `${book.title.replace(/[/\\?%*:|"<>]/g, '_')}.${currentFormat}`;
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    })
    .catch(error => {
      console.error('Error downloading book:', error);
      alert('Failed to download the book. Please try again.');
    });
  };
  
  // Get URL for reader - ensure it's the full API path
  const getReaderUrl = () => {
    return `/library/reading/${id}/${currentFormat}`;
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: 'background.default'
      }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading book information...
        </Typography>
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Box sx={{ 
        p: 3,
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        height: '100vh',
        bgcolor: 'background.default'
      }}>
        <Alert 
          severity="error" 
          sx={{ width: '100%', maxWidth: 500, mb: 2 }}
          action={
            <IconButton color="inherit" size="small" onClick={handleClose}>
              <ArrowBackIcon />
            </IconButton>
          }
        >
          {error}
        </Alert>
        <Typography variant="body1">
          Unable to load the book. Please try again or select a different format.
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleClose} 
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 3 }}
        >
          Return to Library
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default',
      overflow: 'hidden'
    }}>
      {/* Reader header */}
      <Paper 
        sx={{ 
          px: 2, 
          py: 1, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: 0,
          zIndex: 1,
        }}
        elevation={1}
      >
        <IconButton onClick={handleClose}>
          <ArrowBackIcon />
        </IconButton>
        
        <Typography 
          variant="subtitle1" 
          component="div" 
          sx={{ 
            fontWeight: 'medium',
            textAlign: 'center',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {book?.title || 'Book Reader'}
        </Typography>
        
        <Box>
          <Tooltip title="Download this book">
            <IconButton onClick={handleDownload} sx={{ mr: 1 }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={toggleSettings}>
            <SettingsIcon />
          </IconButton>
        </Box>
      </Paper>
      
      {/* Reader content area */}
      <Box 
        ref={readerContainerRef}
        sx={{ 
          flex: 1, 
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
      >
        {/* EPUB Reader */}
        {currentFormat === 'epub' && (
          <Box sx={{ height: '100%' }}>
            <EpubReader 
              url={getReaderUrl()} 
              fontSize={fontSize}
            />
          </Box>
        )}
        
        {/* PDF Reader */}
        {currentFormat === 'pdf' && (
          <Box sx={{ height: '100%' }}>
            <PdfReader 
              url={getReaderUrl()} 
              initialScale={fontSize / 100}
            />
          </Box>
        )}
        
        {/* Fallback for other formats */}
        {currentFormat !== 'epub' && currentFormat !== 'pdf' && (
          <Box sx={{ 
            height: '100%', 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3
          }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              The format {currentFormat.toUpperCase()} cannot be viewed directly in the browser.
            </Alert>
            <Typography variant="body1" paragraph>
              Please download the book to view it in an external reader application.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Download {currentFormat.toUpperCase()}
            </Button>
          </Box>
        )}
      </Box>
      
      {/* Settings drawer */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: { width: { xs: '80%', sm: 300 } }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Reader Settings
          </Typography>
          
          <Divider sx={{ mb: 2 }} />
          
          <Typography id="font-size-slider" gutterBottom>
            Font Size
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <ZoomOutIcon sx={{ mr: 2 }} />
            <Slider
              value={fontSize}
              onChange={handleFontSizeChange}
              aria-labelledby="font-size-slider"
              min={50}
              max={200}
              step={10}
            />
            <ZoomInIcon sx={{ ml: 2 }} />
          </Box>
          
          <Typography id="brightness-slider" gutterBottom>
            Brightness
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <BrightnessLowIcon sx={{ mr: 2 }} />
            <Slider
              value={brightness}
              onChange={handleBrightnessChange}
              aria-labelledby="brightness-slider"
              min={30}
              max={100}
            />
            <BrightnessHighIcon sx={{ ml: 2 }} />
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Available Formats
          </Typography>
          <List dense>
            {availableFormats.map(fmt => (
              <ListItem 
                key={fmt}
                button
                selected={fmt.toLowerCase() === currentFormat.toLowerCase()}
                onClick={() => changeFormat(fmt.toLowerCase())}
              >
                <ListItemText 
                  primary={fmt} 
                  secondary={fmt.toLowerCase() === currentFormat.toLowerCase() ? 'Current' : null}
                />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />}
              fullWidth
              onClick={handleDownload}
            >
              Download {currentFormat.toUpperCase()}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default BookReader;