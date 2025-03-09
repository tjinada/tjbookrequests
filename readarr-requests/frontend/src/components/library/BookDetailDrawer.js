// src/components/library/BookDetailDrawer.js
import React, { useState, useEffect, useContext } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Paper,
  Grid,
  Tooltip,
  Alert,
  Card,
  CardMedia
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SendIcon from '@mui/icons-material/Send';
import TabletIcon from '@mui/icons-material/Tablet';
import KindleIcon from '@mui/icons-material/Tablet'; // Using Tablet as Kindle icon
import InfoIcon from '@mui/icons-material/Info';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import LibraryContext from '../../context/LibraryContext';
import noImage from '../../assets/no-image.png';

// Helper function to get icon for a format
const getFormatIcon = (format) => {
  format = format.toUpperCase();
  switch (format) {
    case 'PDF':
      return <PictureAsPdfIcon />;
    case 'EPUB':
    case 'MOBI':
    case 'AZW3':
    case 'KEPUB':
      return <MenuBookIcon />;
    default:
      return <DescriptionIcon />;
  }
};

const BookDetailDrawer = ({ book, open, onClose }) => {
  const { fetchBookFormats, downloadBook, sendToDevice } = useContext(LibraryContext);
  
  // Local state
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);
  
  // Dialog state
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [deviceType, setDeviceType] = useState('kindle');
  const [email, setEmail] = useState('');
  const [sendingToDevice, setSendingToDevice] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  
  // Load book formats when the drawer opens
  useEffect(() => {
    if (open && book && book.id) {
      setLoading(true);
      
      // Check if book already has formats
      if (book.formats && Array.isArray(book.formats) && book.formats.length > 0) {
        setFormats(book.formats);
        setLoading(false);
      } else {
        // Fetch formats
        fetchBookFormats(book.id)
          .then(formats => {
            setFormats(formats || []);
            setLoading(false);
          })
          .catch(err => {
            console.error('Error fetching formats:', err);
            setError('Failed to load available formats');
            setLoading(false);
          });
      }
    }
  }, [open, book, fetchBookFormats]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle download
  const handleDownload = (format) => {
    if (book && book.id) {
      downloadBook(book.id, format);
    }
  };
  
  // Open send to device dialog
  const handleOpenSendDialog = () => {
    setSendDialogOpen(true);
    // Reset previous results
    setSendResult(null);
  };
  
  // Close send to device dialog
  const handleCloseSendDialog = () => {
    setSendDialogOpen(false);
  };
  
  // Send to device
  const handleSendToDevice = async () => {
    if (!book || !book.id || !deviceType || !email) return;
    
    setSendingToDevice(true);
    setSendResult(null);
    
    try {
      const result = await sendToDevice(book.id, deviceType, email);
      setSendResult(result);
      
      if (result.success) {
        // Close dialog after successful send with a short delay
        setTimeout(() => {
          setSendDialogOpen(false);
        }, 2000);
      }
    } catch (err) {
      setSendResult({
        success: false,
        message: 'Failed to send book to device'
      });
    } finally {
      setSendingToDevice(false);
    }
  };
  
  // Render the book info tab
  const renderInfoTab = () => (
    <Box sx={{ p: 2 }}>
      <Card elevation={0} sx={{ mb: 3, maxWidth: 300, mx: 'auto' }}>
        <CardMedia
          component="img"
          image={book.cover || noImage}
          alt={book.title}
          sx={{ 
            height: 300,
            objectFit: 'contain',
            bgcolor: 'background.paper',
            borderRadius: 1
          }}
        />
      </Card>
      
      <Typography variant="subtitle1" fontWeight="bold">
        Book Details
      </Typography>
      
      <Divider sx={{ my: 1 }} />
      
      <List dense>
        <ListItem>
          <ListItemIcon>
            <InfoIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Title" 
            secondary={book.title} 
            primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
            secondaryTypographyProps={{ variant: 'body1' }}
          />
        </ListItem>
        
        <ListItem>
          <ListItemIcon>
            <InfoIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Author" 
            secondary={book.author} 
            primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
            secondaryTypographyProps={{ variant: 'body1' }}
          />
        </ListItem>
        
        {book.publisher && (
          <ListItem>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Publisher" 
              secondary={book.publisher} 
              primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
              secondaryTypographyProps={{ variant: 'body1' }}
            />
          </ListItem>
        )}
        
        {book.added && (
          <ListItem>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Added to Library" 
              secondary={new Date(book.added).toLocaleDateString()} 
              primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
              secondaryTypographyProps={{ variant: 'body1' }}
            />
          </ListItem>
        )}
      </List>
      
      {book.tags && book.tags.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Tags
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {book.tags.map(tag => (
              <Chip key={tag} label={tag} size="small" />
            ))}
          </Box>
        </Box>
      )}
      
      {book.comments && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Description
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Typography 
            variant="body2" 
            component="div"
            dangerouslySetInnerHTML={{ __html: book.comments }}
            sx={{ mt: 1 }}
          />
        </Box>
      )}
    </Box>
  );
  
  // Render the download tab
  const renderDownloadTab = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Available Formats
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      ) : formats.length === 0 ? (
        <Alert severity="info" sx={{ my: 2 }}>
          No downloadable formats available for this book.
        </Alert>
      ) : (
        <List>
          {formats.map(format => (
            <ListItem key={format} disablePadding>
              <ListItemButton onClick={() => handleDownload(format)}>
                <ListItemIcon>
                  {getFormatIcon(format)}
                </ListItemIcon>
                <ListItemText primary={`Download ${format}`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
      
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Send to Device
      </Typography>
      
      <Button
        variant="outlined"
        startIcon={<SendIcon />}
        onClick={handleOpenSendDialog}
        fullWidth
        sx={{ mt: 1 }}
        disabled={formats.length === 0}
      >
        Send to E-Reader
      </Button>
    </Box>
  );
  
  if (!book) return null;
  
  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 } }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2" noWrap>
            {book.title}
          </Typography>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider />
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Info" />
          <Tab label="Download" />
        </Tabs>
        
        <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
          {activeTab === 0 && renderInfoTab()}
          {activeTab === 1 && renderDownloadTab()}
        </Box>
      </Drawer>
      
      {/* Send to Device Dialog */}
      <Dialog open={sendDialogOpen} onClose={handleCloseSendDialog}>
        <DialogTitle>Send "{book.title}" to Device</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Device Type"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
            fullWidth
            margin="normal"
          >
            <MenuItem value="kindle">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <KindleIcon sx={{ mr: 1 }} />
                Kindle
              </Box>
            </MenuItem>
            <MenuItem value="kobo">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TabletIcon sx={{ mr: 1 }} />
                Kobo
              </Box>
            </MenuItem>
          </TextField>
          
          <TextField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            helperText={`This will send the book to your ${deviceType === 'kindle' ? 'Kindle' : 'Kobo'} device`}
          />
          
          {sendResult && (
            <Alert 
              severity={sendResult.success ? "success" : "error"}
              sx={{ mt: 2 }}
            >
              {sendResult.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSendDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSendToDevice}
            disabled={sendingToDevice || !email}
            startIcon={sendingToDevice ? <CircularProgress size={16} /> : <SendIcon />}
          >
            {sendingToDevice ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BookDetailDrawer;