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
  Alert,
  CircularProgress
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
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  border: '1px solid',
  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 12px 24px rgba(0,0,0,0.2)'
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
  const [isSending, setIsSending] = useState(false);

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
    
    // Set sending state to show loading indicator
    setIsSending(true);
    
    // Save email for future use
    localStorage.setItem('lastUsedEmail', email);
    
    // Send book
    if (sendToDevice) {
      // Show in-progress notification
      showNotification(`Sending ${book.title} to ${email}...`, 'info');
      
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
        })
        .finally(() => {
          setIsSending(false);
        });
    } else {
      // Fallback if context function not available
      // Simulate network delay for demonstration
      setTimeout(() => {
        showNotification(`Sent ${book.title} to ${email}`, 'success');
        setIsSending(false);
        handleCloseEmailDialog();
      }, 1500);
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
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'row',
          height: '100%',
          position: 'relative'
        }}>
          {/* Left side - Book Cover */}
          <Box sx={{ 
            width: '65%', 
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <CardMedia
              component="img"
              image={book.cover || noImage}
              alt={book.title}
              sx={{ 
                height: 'auto',
                maxHeight: 180,
                width: 'auto',
                maxWidth: '100%',
                objectFit: 'contain',
                borderRadius: 1,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
              imgProps={{
                crossOrigin: "anonymous"
              }}
            />
            
            {/* Format badge */}
            {formats.length > 0 && (
              <Chip
                label={formats[0]}
                size="small"
                sx={{ 
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  fontSize: '0.7rem',
                  backgroundColor: 'primary.main',
                  color: 'white',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              />
            )}
            
            {/* Additional formats count */}
            {formats.length > 1 && (
              <Chip
                label={`+${formats.length - 1}`}
                size="small"
                sx={{ 
                  position: 'absolute',
                  top: 8,
                  left: formats[0] ? 'auto' : 8,
                  right: formats[0] ? 8 : 'auto',
                  fontSize: '0.7rem',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                }}
              />
            )}
          </Box>
          
          {/* Right side - Info and buttons */}
          <Box sx={{ 
            width: '35%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(42,45,50,1)' : 'rgba(245,247,250,1)',
            borderLeft: '1px solid',
            borderLeftColor: 'divider'
          }}>
            {/* Book info */}
            <Box sx={{ p: 1.5, flexGrow: 1 }}>
              <Typography 
                variant="h6" 
                component="h2" 
                sx={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 600,
                  lineHeight: 1.2,
                  mb: 1,
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
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  fontStyle: 'italic',
                  mb: 2
                }}
              >
                {book.author}
              </Typography>
            </Box>
            
            {/* Vertically stacked action buttons */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: 1,
              p: 1,
              mt: 'auto'
            }}>
              <Tooltip title="Read">
                <IconButton 
                  size="small" 
                  onClick={handleReadBook}
                  sx={{ 
                    color: 'white', 
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                >
                  <MenuBookIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Download">
                <IconButton 
                  size="small" 
                  onClick={handleFormatMenuClick}
                  sx={{ 
                    color: 'white', 
                    bgcolor: 'secondary.main',
                    '&:hover': { bgcolor: 'secondary.dark' }
                  }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              {formats.length > 0 && (
                <Tooltip title="Send to Email">
                  <IconButton 
                    size="small" 
                    onClick={handleOpenEmailDialog(formats[0])}
                    sx={{ 
                      color: 'white', 
                      bgcolor: 'info.main',
                      '&:hover': { bgcolor: 'info.dark' }
                    }}
                  >
                    <EmailIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>
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
            disabled={isSending}
          />
          
          {isSending && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="body2">Sending email, please wait...</Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleCloseEmailDialog}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Box sx={{ position: 'relative' }}>
            <Button 
              onClick={handleSendToEmail} 
              variant="contained" 
              startIcon={isSending ? null : <SendIcon />}
              disabled={!email || isSending}
            >
              {isSending ? 'Sending...' : 'Send'}
            </Button>
            {isSending && (
              <CircularProgress
                size={24}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginTop: '-12px',
                  marginLeft: '-12px',
                }}
              />
            )}
          </Box>
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