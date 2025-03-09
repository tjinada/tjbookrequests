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
  useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import BrightnessHighIcon from '@mui/icons-material/BrightnessHigh';
import BrightnessLowIcon from '@mui/icons-material/BrightnessLow';
import SettingsIcon from '@mui/icons-material/Settings';
import api from '../../utils/api';

// This is a simple placeholder for a book reader component
// In a real application, you would use a more sophisticated library for EPUB/PDF reading
// such as epub.js, pdf.js, or a commercial solution
const BookReader = () => {
  const { id, format = 'epub' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for reader
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [book, setBook] = useState(null);
  
  // Reader settings
  const [fontSize, setFontSize] = useState(100); // percentage
  const [brightness, setBrightness] = useState(100); // percentage
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Content frame reference
  const contentRef = useRef(null);
  
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
        // Get book details
        const bookResponse = await api.get(`/library/book/${id}`);
        setBook(bookResponse.data);
        
        // For a real reader, you would load the book content here
        // This placeholder just simulates loading
        setTimeout(() => {
          setLoading(false);
        }, 1500);
      } catch (err) {
        console.error('Error loading book:', err);
        setError('Failed to load book. Please try again.');
        setLoading(false);
      }
    };
    
    loadBook();
  }, [id, format]);
  
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
    
    // Apply font size to content
    if (contentRef.current) {
      contentRef.current.style.fontSize = `${newValue}%`;
    }
  };
  
  // Update brightness
  const handleBrightnessChange = (event, newValue) => {
    setBrightness(newValue);
    
    // Apply brightness to content container
    if (contentRef.current) {
      const opacity = (100 - newValue) / 100;
      contentRef.current.style.boxShadow = `inset 0 0 0 2000px rgba(0, 0, 0, ${opacity})`;
    }
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
          Loading book...
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
        
        <IconButton onClick={toggleSettings}>
          <SettingsIcon />
        </IconButton>
      </Paper>
      
      {/* Reader content area */}
      <Box 
        ref={contentRef}
        sx={{ 
          flex: 1, 
          overflowY: 'auto',
          p: 2,
          transition: 'all 0.3s ease',
          fontSize: `${fontSize}%`
        }}
      >
        {/* This is a placeholder for actual book content */}
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
          <Typography variant="h4" gutterBottom align="center">
            {book?.title || 'Sample Book'}
          </Typography>
          
          <Typography variant="h6" gutterBottom align="center" color="text.secondary">
            {book?.author || 'Unknown Author'}
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography paragraph>
            This is a placeholder for the actual book content. In a real implementation,
            you would integrate an EPUB or PDF reader library to display the book content here.
          </Typography>
          
          <Typography paragraph>
            For EPUBs, you could use libraries like epub.js or Readium.
            For PDFs, you could use libraries like PDF.js.
          </Typography>
          
          <Typography paragraph>
            The content would be loaded from the server using the endpoint:
            <Box component="code" sx={{ display: 'block', bgcolor: 'background.paper', p: 1, mt: 1, borderRadius: 1 }}>
              /api/library/reading/{id}/{format}
            </Box>
          </Typography>
          
          <Typography paragraph>
            Adjust the font size and brightness using the settings panel to see how those controls work in this demo.
          </Typography>
          
          {/* Create some dummy paragraphs to demonstrate scrolling */}
          {Array.from({ length: 10 }).map((_, index) => (
            <Typography key={index} paragraph>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor. Ut in nulla enim. Phasellus molestie magna non est bibendum non venenatis nisl tempor. Suspendisse dictum feugiat nisl ut dapibus. Mauris iaculis porttitor posuere.
            </Typography>
          ))}
        </Box>
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
            {book?.formats?.map(fmt => (
              <ListItem 
                key={fmt}
                button
                selected={fmt.toLowerCase() === format.toLowerCase()}
                onClick={() => navigate(`/read/${id}/${fmt.toLowerCase()}`)}
              >
                <ListItemText 
                  primary={fmt} 
                  secondary={fmt.toLowerCase() === format.toLowerCase() ? 'Current' : null}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default BookReader;