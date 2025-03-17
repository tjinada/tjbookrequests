// src/components/library/BookDetailDrawer.js
import React, { useState, useEffect, useContext } from 'react';
import {
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
  CardMedia,
  Drawer
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
  
  // Validate email format
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };
  
  // Open send to device dialog
  const handleOpenSendDialog = () => {
    setSendDialogOpen(true);
    // Reset previous results
    setSendResult(null);
    
    // Try to load previously saved email for the current device type
    const savedEmail = localStorage.getItem(`${deviceType}Email`);
    if (savedEmail) {
      setEmail(savedEmail);
    }
  };
  
  // Close send to device dialog
  const handleCloseSendDialog = () => {
    setSendDialogOpen(false);
  };
  
  // Handle device type change - load saved email for that device type
  const handleDeviceTypeChange = (e) => {
    const newDeviceType = e.target.value;
    setDeviceType(newDeviceType);
    
    // Try to load previously saved email for this device type
    const savedEmail = localStorage.getItem(`${newDeviceType}Email`);
    if (savedEmail) {
      setEmail(savedEmail);
    }
  };
  
  // Send to device
  const handleSendToDevice = async () => {
    if (!book || !book.id || !deviceType || !email) return;
    
    // Validate email format
    if (!validateEmail(email)) {
      setSendResult({
        success: false,
        message: 'Please enter a valid email address'
      });
      return;
    }
    
    setSendingToDevice(true);
    setSendResult(null);
    
    try {
      const result = await sendToDevice(book.id, deviceType, email);
      setSendResult(result);
      
      // Save email in localStorage for convenience (if successful)
      if (result.success) {
        localStorage.setItem(`${deviceType}Email`, email);
        
        // Close dialog after successful send with a short delay
        setTimeout(() => {
          setSendDialogOpen(false);
        }, 2000);
      }
    } catch (err) {
      setSendResult({
        success: false,
        message: err.response?.data?.message || 'Failed to send book to device'
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
          {/* Book cover and basic info */}
          <Box sx={{ display: 'flex', mb: 2, mt: 1 }}>
            <Box
              component="img"
              src={book.cover || noImage}
              alt={book.title}
              sx={{ 
                width: 60, 
                height: 90, 
                objectFit: 'contain', 
                borderRadius: 1,
                mr: 2
              }}
            />
            <Box>
              <Typography variant="subtitle1">{book.title}</Typography>
              <Typography variant="body2" color="text.secondary">{book.author}</Typography>
              
              {/* Format badges */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {book.formats && book.formats.map(fmt => (
                  <Chip 
                    key={fmt} 
                    label={fmt} 
                    size="small" 
                    variant={
                      (deviceType === 'kindle' && (fmt === 'MOBI' || fmt === 'AZW3')) ||
                      (deviceType === 'kobo' && (fmt === 'EPUB' || fmt === 'KEPUB')) ||
                      (deviceType === 'other' && fmt === 'EPUB')
                        ? 'filled' : 'outlined'
                    }
                    color={
                      (deviceType === 'kindle' && (fmt === 'MOBI' || fmt === 'AZW3')) ||
                      (deviceType === 'kobo' && (fmt === 'EPUB' || fmt === 'KEPUB')) ||
                      (deviceType === 'other' && fmt === 'EPUB')
                        ? 'primary' : 'default'
                    }
                  />
                ))}
              </Box>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <TextField
            select
            label="Device Type"
            value={deviceType}
            onChange={handleDeviceTypeChange}
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
            <MenuItem value="other">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TabletIcon sx={{ mr: 1 }} />
                Other E-Reader
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
            required
            error={email && !validateEmail(email)}
            helperText={
              email && !validateEmail(email) 
                ? "Please enter a valid email address" 
                : deviceType === 'kindle' 
                  ? "Enter your Kindle email (ends with @kindle.com)" 
                  : deviceType === 'kobo' 
                    ? "Enter your email associated with Kobo"
                    : "Enter the email address to send the ebook to"
            }
          />
          
          {/* Format information */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Format Information:
            </Typography>
            {deviceType === 'kindle' && (
              <Typography variant="body2" color="text.secondary">
                {book.formats?.some(f => f.toUpperCase() === 'MOBI') 
                  ? "MOBI format will be used for your Kindle." 
                  : book.formats?.some(f => f.toUpperCase() === 'AZW3')
                    ? "AZW3 format will be used for your Kindle."
                    : book.formats?.some(f => f.toUpperCase() === 'EPUB')
                      ? "EPUB format will be converted to MOBI for your Kindle."
                      : book.formats?.some(f => f.toUpperCase() === 'PDF')
                        ? "PDF format will be sent to your Kindle."
                        : "No compatible format is available for Kindle."}
              </Typography>
            )}
            {deviceType === 'kobo' && (
              <Typography variant="body2" color="text.secondary">
                {book.formats?.some(f => f.toUpperCase() ==='KEPUB') 
                  ? "KEPUB format will be used for your Kobo." 
                  : book.formats?.some(f => f.toUpperCase() === 'EPUB')
                    ? "EPUB format will be used for your Kobo."
                    : book.formats?.some(f => f.toUpperCase() === 'PDF')
                      ? "PDF format will be sent to your Kobo."
                      : "No compatible format is available for Kobo."}
              </Typography>
            )}
            {deviceType === 'other' && (
              <Typography variant="body2" color="text.secondary">
                {book.formats?.includes('EPUB') 
                  ? "EPUB format will be used for your device." 
                  : book.formats?.includes('PDF')
                    ? "PDF format will be used for your device."
                    : book.formats?.length > 0
                      ? `${book.formats[0]} format will be used for your device.`
                      : "No formats are available for this book."}
              </Typography>
            )}
          </Box>

          {deviceType === 'kindle' && book.formats?.some(f => f.toLowerCase() === 'epub') && 
            !book.formats?.some(f => ['mobi', 'azw3'].includes(f.toLowerCase())) && (
            <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
              EPUB format will be automatically converted to MOBI for your Kindle.
            </Alert>
          )}
          
          {deviceType === 'kindle' && (
            <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
              Make sure to add {process.env.REACT_APP_SMTP_FROM || 'our email address'} to your 
              approved senders list in your Amazon account settings.
            </Alert>
          )}
          
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
          <Button 
            onClick={handleCloseSendDialog}
            disabled={sendingToDevice}
          >
            {sendResult?.success ? 'Close' : 'Cancel'}
          </Button>
          
          {!sendResult?.success && (
            <Button 
              variant="contained" 
              onClick={handleSendToDevice}
              disabled={sendingToDevice || !email || (email && !validateEmail(email)) || 
                // Disable if no compatible format is available (case-insensitive)
                (deviceType === 'kindle' && !book.formats?.some(f => 
                  ['mobi', 'azw3', 'epub', 'pdf'].includes(f.toLowerCase()))) ||
                (deviceType === 'kobo' && !book.formats?.some(f => 
                  ['kepub', 'epub', 'pdf'].includes(f.toLowerCase()))) ||
                (deviceType === 'other' && book.formats?.length === 0)
              }
              startIcon={sendingToDevice ? <CircularProgress size={16} /> : <SendIcon />}
              color="primary"
            >
              {sendingToDevice ? 'Sending...' : 'Send to Device'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BookDetailDrawer;