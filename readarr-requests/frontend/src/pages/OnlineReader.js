// src/pages/OnlineReader.js
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Slider,
  Button,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import TocIcon from '@mui/icons-material/Toc';
import SettingsIcon from '@mui/icons-material/Settings';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import BrightnessLowIcon from '@mui/icons-material/BrightnessLow';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import api from '../utils/api';

// Mock ePub reader implementation (in a real app, you'd use a library like Epub.js)
const EpubReader = ({ url, fontSize, onLocationChange, initialLocation }) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    // In a real implementation, this would initialize the ePub reader
    console.log(`Loading ePub from ${url} at location ${initialLocation}`);
    
    // Mock content for demonstration
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div style="font-size: ${fontSize}px; line-height: 1.6; padding: 20px;">
          <h2>Sample eBook Content</h2>
          <p>This is a sample reader interface. In a real implementation, this would render the actual ebook content using a library like Epub.js.</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum. Cras porttitor metus non arcu pulvinar, ut viverra justo condimentum. Aliquam erat volutpat. In quis lobortis libero, finibus lobortis nisi.</p>
          <p>Integer auctor est et neque dignissim, sit amet vestibulum purus scelerisque. Quisque ac odio at turpis porttitor mattis. Duis semper, nibh nec maximus vulputate, mauris orci tincidunt metus, et vulputate nisi justo eu enim.</p>
          <p>Nulla facilisi. Duis quis nulla et ante feugiat iaculis id vitae erat. Cras at consequat justo, vitae tempus sem. Sed porttitor ipsum nec lorem venenatis, eu dignissim ex euismod.</p>
        </div>
      `;
    }
    
    return () => {
      // Cleanup function in a real implementation
    };
  }, [url, fontSize, initialLocation]);

  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        height: '100%', 
        overflowY: 'auto',
        backgroundColor: 'background.paper' 
      }}
    />
  );
};

const OnlineReader = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null);
  const [fontSize, setFontSize] = useState(18);
  const [currentLocation, setCurrentLocation] = useState(0);
  const [chapters, setChapters] = useState([
    { title: 'Chapter 1: Introduction', href: '1' },
    { title: 'Chapter 2: Beginning', href: '2' },
    { title: 'Chapter 3: Middle', href: '3' },
    { title: 'Chapter 4: Conclusion', href: '4' }
  ]); // Mock chapters
  
  // Fetch book details
  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get(`/library/${id}`);
        setBook(response.data);
        
        // In a real implementation, you would also fetch the book content
        // and parse the chapters
        // For now, we'll use mock data
        
        // Update reading position
        if (response.data.currentPosition) {
          setCurrentLocation(response.data.currentPosition);
        }
      } catch (err) {
        console.error('Error fetching book for reading:', err);
        setError('Failed to load book. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);
  
  // Save reading position when component unmounts or location changes
  useEffect(() => {
    const saveReadingPosition = async () => {
      if (book && currentLocation > 0) {
        try {
          await api.put(`/library/${id}`, {
            currentPosition: currentLocation
          });
        } catch (err) {
          console.error('Error saving reading position:', err);
        }
      }
    };
    
    // Save position when component unmounts
    return () => {
      saveReadingPosition();
    };
  }, [id, book, currentLocation]);
  
  // Handle drawer toggle
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  // Handle navigation back
  const handleBack = () => {
    navigate(`/library/${id}`);
  };
  
  // Handle settings menu
  const handleSettingsClick = (event) => {
    setSettingsMenuAnchor(event.currentTarget);
  };
  
  const handleSettingsClose = () => {
    setSettingsMenuAnchor(null);
  };
  
  // Handle font size change
  const handleFontSizeChange = (event, newValue) => {
    setFontSize(newValue);
  };
  
  // Handle chapter navigation
  const handleChapterClick = (href) => {
    // In a real implementation, this would navigate to the chapter
    console.log(`Navigating to chapter: ${href}`);
    setCurrentLocation(parseInt(href));
    setDrawerOpen(false);
  };
  
  // Handle location change from the reader
  const handleLocationChange = (location) => {
    setCurrentLocation(location);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Book Details
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  if (!book) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Book Details
        </Button>
        <Alert severity="warning">Book not found</Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Reader toolbar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="subtitle1" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            {isMobile ? (
              <Box component="div" sx={{ 
                width: '100%', 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {book.title}
              </Box>
            ) : (
              <>
                {book.title} <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>by {book.author}</Typography>
              </>
            )}
          </Typography>
          
          <IconButton
            color="inherit"
            aria-label="table of contents"
            onClick={toggleDrawer}
          >
            <TocIcon />
          </IconButton>
          
          <IconButton
            color="inherit"
            aria-label="settings"
            onClick={handleSettingsClick}
          >
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Main content - Reader */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <EpubReader 
          url={`/api/library/${id}/download`}
          fontSize={fontSize}
          onLocationChange={handleLocationChange}
          initialLocation={currentLocation}
        />
      </Box>
      
      {/* Table of Contents drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
      >
        <Box
          sx={{ width: 280 }}
          role="presentation"
        >
          <List
            subheader={
              <Box sx={{ 
                p: 2, 
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="subtitle1" component="div">
                  Table of Contents
                </Typography>
                <IconButton size="small" onClick={toggleDrawer}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            {chapters.map((chapter, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  onClick={() => handleChapterClick(chapter.href)}
                  selected={currentLocation.toString() === chapter.href}
                >
                  <ListItemText primary={chapter.title} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      
      {/* Settings menu */}
      <Menu
        anchorEl={settingsMenuAnchor}
        open={Boolean(settingsMenuAnchor)}
        onClose={handleSettingsClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem disabled>
          <Box sx={{ display: 'flex', alignItems: 'center', width: 200 }}>
            <FormatSizeIcon sx={{ mr: 1 }} />
            <Typography variant="body2">Font Size</Typography>
          </Box>
        </MenuItem>
        <MenuItem>
          <Box sx={{ px: 2, width: '100%' }}>
            <Slider
              value={fontSize}
              onChange={handleFontSizeChange}
              aria-labelledby="font-size-slider"
              min={12}
              max={36}
              step={1}
              marks={[
                { value: 12, label: 'A' },
                { value: 24, label: 'A' },
                { value: 36, label: 'A' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleSettingsClose}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BookmarkIcon sx={{ mr: 1 }} />
            <Typography variant="body2">Add Bookmark</Typography>
          </Box>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default OnlineReader;