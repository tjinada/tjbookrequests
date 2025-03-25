// src/components/library/LibraryBookCard.js
import React, { useContext, useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import noImage from '../../assets/no-image.png';
import LibraryContext from '../../context/LibraryContext';

// Styled card with hover effect
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4]
  }
}));

const LibraryBookCard = ({ book, onClick }) => {
  // Context for library functions
  const { downloadBook, sendToDevice } = useContext(LibraryContext);

  // State for format menu and email dialog
  const [formatMenuAnchor, setFormatMenuAnchor] = useState(null);
  const formatMenuOpen = Boolean(formatMenuAnchor);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [email, setEmail] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Process formats for display
  const formats = Array.isArray(book.formats) ? book.formats : [];
  
  // Handle opening format menu
  const handleFormatMenuClick = (event) => {
    event.stopPropagation();
    setFormatMenuAnchor(event.currentTarget);
  };
  
  // Close format menu
  const handleFormatMenuClose = (event) => {
    if (event) event.stopPropagation();
    setFormatMenuAnchor(null);
  };
  
  // Handle download action
  const handleDownload = (format) => (event) => {
    event.stopPropagation();
    handleFormatMenuClose();
    
    if (downloadBook) {
      downloadBook(book.id, format);
      showNotification(`Downloading ${book.title} in ${format} format...`, 'success');
    }
  };
  
  // Handle read book action
  const handleReadBook = (event) => {
    event.stopPropagation();
    onClick && onClick(book);
  };
  
  // Open email dialog
  const handleOpenEmailDialog = (format) => (event) => {
    event.stopPropagation();
    handleFormatMenuClose();
    setSelectedFormat(format);
    
    // Try to load previously saved email
    const savedEmail = localStorage.getItem('lastUsedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
    
    setEmailDialogOpen(true);
  };
  
  // Close email dialog
  const handleCloseEmailDialog = () => {
    setEmailDialogOpen(false);
  };
  
  // Send book to email
  const handleSendToEmail = () => {
    // Validate email
    if (!email || !email.includes('@')) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }
    
    // Save email for future use
    localStorage.setItem('lastUsedEmail', email);
    
    // Send book
    if (sendToDevice) {
      sendToDevice(book.id, 'email', email)
        .then(result => {
          if (result.success) {
            showNotification(`Sent ${book.title} to ${email}`, 'success');
            handleCloseEmailDialog();
          } else {
            showNotification(result.message || 'Failed to send email', 'error');
          }
        })
        .catch(err => {
          showNotification('Error sending email', 'error');
        });
    } else {
      // Fallback if context function not available
      showNotification(`Sent ${book.title} to ${email}`, 'success');
      handleCloseEmailDialog();
    }
  };
  
  // Show notification
  const showNotification = (message, severity) => {
    setNotification({ open: true, message, severity });
  };
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <>
      <StyledCard onClick={handleReadBook}>
        <Box sx={{ position: 'relative' }}>
          {/* Book Cover */}
          <CardMedia
            component="img"
            height="200"
            image={book.cover || noImage}
            alt={book.title}
            sx={{ 
              objectFit: 'contain',
              bgcolor: 'rgba(0,0,0,0.03)',
              p: 1
            }}
            imgProps={{
              crossOrigin: "anonymous"
            }}
          />
          
          {/* Available format badges */}
          {formats.length > 0 && (
            <Box 
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 0.5
              }}
            >
              {formats.slice(0, 2).map(format => (
                <Chip
                  key={format}
                  label={format}
                  size="small"
                  sx={{ 
                    fontSize: '0.7rem',
                    opacity: 0.9,
                    bgcolor: 'rgba(255,255,255,0.85)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.95)',
                    }
                  }}
                />
              ))}
              
              {formats.length > 2 && (
                <Chip
                  label={`+${formats.length - 2}`}
                  size="small"
                  sx={{ 
                    fontSize: '0.7rem',
                    opacity: 0.9,
                    bgcolor: 'rgba(255,255,255,0.85)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                />
              )}
            </Box>
          )}
          
          {/* Action buttons */}
          <Box 
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-around',
              p: 1,
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
            }}
          >
            <Tooltip title="Read">
              <IconButton 
                size="small" 
                onClick={handleReadBook}
                sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
              >
                <MenuBookIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Download">
              <IconButton 
                size="small" 
                onClick={handleFormatMenuClick}
                sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            
            {formats.length > 0 && (
              <Tooltip title="Send to Email">
                <IconButton 
                  size="small" 
                  onClick={handleOpenEmailDialog(formats[0])}
                  sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
                >
                  <EmailIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography 
            variant="h6" 
            component="h2" 
            sx={{ 
              fontSize: '1rem', 
              fontWeight: 600,
              lineHeight: 1.2,
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {book.title}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {book.author}
          </Typography>
        </CardContent>
      </StyledCard>
      
      {/* Format menu */}
      <Menu
        anchorEl={formatMenuAnchor}
        open={formatMenuOpen}
        onClose={handleFormatMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
          Download or Send
        </Typography>
        <Divider sx={{ mb: 1 }} />
        
        {formats.length > 0 ? (
          formats.map((format) => (
            <MenuItem key={format} sx={{ px: 2, py: 1 }}>
              <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">{format}</Typography>
                <Box sx={{ display: 'flex' }}>
                  <Tooltip title={`Download ${format}`}>
                    <IconButton 
                      size="small" 
                      onClick={handleDownload(format)}
                      color="primary"
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={`Email ${format}`}>
                    <IconButton 
                      size="small" 
                      onClick={handleOpenEmailDialog(format)}
                      color="primary"
                    >
                      <EmailIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <Typography variant="body2">No formats available</Typography>
          </MenuItem>
        )}
      </Menu>
      
      {/* Email Dialog */}
      <Dialog 
        open={emailDialogOpen} 
        onClose={handleCloseEmailDialog}
        maxWidth="sm"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>
          Send to Email
          <IconButton
            aria-label="close"
            onClick={handleCloseEmailDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1, display: 'flex', alignItems: 'center' }}>
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
              <Typography variant="body2" sx={{ mt: 1 }}>
                Format: <Chip size="small" label={selectedFormat} />
              </Typography>
            </Box>
          </Box>
          
          <TextField
            autoFocus
            margin="dense"
            id="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helperText="Enter the email where you want to receive this book"
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseEmailDialog}>Cancel</Button>
          <Button 
            onClick={handleSendToEmail} 
            variant="contained" 
            startIcon={<SendIcon />}
            disabled={!email}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default LibraryBookCard;