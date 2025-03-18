// src/components/library/SendToDeviceDialog.js
import React, { useState, useContext, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import TabletIcon from '@mui/icons-material/Tablet';
import DevicesIcon from '@mui/icons-material/Devices';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import LanguageIcon from '@mui/icons-material/Language';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LibraryContext from '../../context/LibraryContext';

const SendToDeviceDialog = ({ open, onClose, book, formats = [] }) => {
  const { sendToDevice } = useContext(LibraryContext);
  
  // Initial state from localStorage if available
  const initialDevice = localStorage.getItem('lastDeviceType') || 'kindle';
  const initialEmail = localStorage.getItem(`${initialDevice}Email`) || '';
  
  // State
  const [deviceType, setDeviceType] = useState(initialDevice);
  const [email, setEmail] = useState(initialEmail);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  // Helper functions for device-specific formats
  const getPreferredFormats = (device) => {
    switch (device) {
      case 'kindle':
        return ['mobi', 'azw3', 'pdf', 'epub'];
      case 'kobo':
        return ['epub', 'kepub', 'pdf'];
      case 'android':
      case 'ios':
        return ['epub', 'pdf'];
      default:
        return ['epub', 'pdf', 'mobi'];
    }
  };
  
  // Set the best available format for the selected device
  useEffect(() => {
    if (formats.length > 0) {
      const preferred = getPreferredFormats(deviceType);
      
      // Find the first available preferred format
      for (const format of preferred) {
        const found = formats.find(f => f.toLowerCase() === format.toLowerCase());
        if (found) {
          setSelectedFormat(found);
          break;
        }
      }
      
      // If no preferred format is found, use the first available
      if (!selectedFormat) {
        setSelectedFormat(formats[0]);
      }
    }
  }, [deviceType, formats, selectedFormat]);
  
  // Update email when device type changes
  useEffect(() => {
    const savedEmail = localStorage.getItem(`${deviceType}Email`);
    if (savedEmail) {
      setEmail(savedEmail);
    } else {
      setEmail('');
    }
  }, [deviceType]);
  
  // Validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  // Handle device type change
  const handleDeviceChange = (event) => {
    setDeviceType(event.target.value);
    localStorage.setItem('lastDeviceType', event.target.value);
  };
  
  // Handle email change
  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };
  
  // Handle format selection
  const handleFormatChange = (event) => {
    setSelectedFormat(event.target.value);
  };
  
  // Send to device
  const handleSend = async () => {
    if (!book?.id || !deviceType || !email || !selectedFormat) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      // Save email for future use
      localStorage.setItem(`${deviceType}Email`, email);
      
      const response = await sendToDevice(book.id, deviceType, email, selectedFormat);
      
      setResult({
        success: true,
        message: response.message || 'Book successfully sent to your device!'
      });
      
      // Close dialog after success with a delay
      setTimeout(() => {
        if (open) onClose();
      }, 2000);
    } catch (error) {
      setResult({
        success: false,
        message: error.message || 'Failed to send book to device. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Get device-specific helper text
  const getDeviceHelperText = () => {
    switch (deviceType) {
      case 'kindle':
        return 'Enter your Send-to-Kindle email address (ends with @kindle.com)';
      case 'kobo':
        return 'Enter your Kobo-associated email address';
      case 'android':
        return 'We\'ll email the file to this address';
      case 'ios':
        return 'We\'ll email the file to this address';
      default:
        return 'Enter the email address to send the ebook to';
    }
  };
  
  // Get device-specific icon
  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'kindle':
      case 'kobo':
        return <TabletIcon />;
      case 'android':
        return <SmartphoneIcon />;
      case 'ios':
        return <SmartphoneIcon />;
      default:
        return <DevicesIcon />;
    }
  };
  
  // Get best format explanation text
  const getFormatExplanationText = () => {
    if (!selectedFormat) return 'No format selected';
    
    switch (deviceType) {
      case 'kindle':
        return selectedFormat.toLowerCase() === 'mobi' 
          ? 'MOBI is the native format for Kindle devices' 
          : selectedFormat.toLowerCase() === 'azw3'
            ? 'AZW3 is an enhanced Kindle format with better formatting'
            : selectedFormat.toLowerCase() === 'pdf'
              ? 'PDF will be sent as-is (may not reflow text properly on Kindle)'
              : `${selectedFormat.toUpperCase()} will be converted to MOBI format for your Kindle`;
      case 'kobo':
        return selectedFormat.toLowerCase() === 'kepub' 
          ? 'KEPUB is the native format for Kobo devices' 
          : selectedFormat.toLowerCase() === 'epub'
            ? 'EPUB is fully compatible with Kobo devices'
            : 'PDF will be sent as-is (may not reflow text properly)';
      default:
        return `${selectedFormat.toUpperCase()} format will be sent to your device`;
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={!loading ? onClose : undefined}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>
        Send to Device
      </DialogTitle>
      
      <DialogContent>
        {/* Book info */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          {book?.coverUrl && (
            <Box
              component="img"
              src={book.coverUrl}
              alt={book?.title}
              sx={{
                width: 60,
                height: 90,
                objectFit: 'cover',
                borderRadius: 1,
                mr: 2
              }}
            />
          )}
          <Box>
            <Typography variant="subtitle1" component="div">
              {book?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {book?.author}
            </Typography>
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Device selection */}
        <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
          <FormLabel component="legend">Device Type</FormLabel>
          <RadioGroup
            row
            name="device-type"
            value={deviceType}
            onChange={handleDeviceChange}
          >
            <FormControlLabel 
              value="kindle" 
              control={<Radio />} 
              label="Kindle" 
            />
            <FormControlLabel 
              value="kobo" 
              control={<Radio />} 
              label="Kobo" 
            />
            <FormControlLabel 
              value="other" 
              control={<Radio />} 
              label="Other" 
            />
          </RadioGroup>
        </FormControl>
        
        {/* Format selection */}
        <FormControl fullWidth margin="normal">
          <FormLabel component="legend">Format</FormLabel>
          <TextField
            select
            fullWidth
            value={selectedFormat}
            onChange={handleFormatChange}
            helperText={getFormatExplanationText()}
            margin="dense"
            disabled={formats.length <= 1}
          >
            {formats.map((format) => (
              <MenuItem key={format} value={format}>
                {format.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
        </FormControl>
        
        {/* Email input */}
        <TextField
          label="Email Address"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={handleEmailChange}
          error={email !== '' && !isValidEmail(email)}
          helperText={email !== '' && !isValidEmail(email) 
            ? "Please enter a valid email address" 
            : getDeviceHelperText()
          }
          required
          disabled={loading}
          InputProps={{
            startAdornment: (
              <Box sx={{ mr: 1, color: 'text.secondary' }}>
                {getDeviceIcon()}
              </Box>
            ),
          }}
        />
        
        {/* Special instructions for Kindle */}
        {deviceType === 'kindle' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              To receive content on your Kindle, you need to add our email address to your Approved Personal Document E-mail List in your Amazon account settings.
            </Typography>
          </Alert>
        )}
        
        {/* Result message */}
        {result && (
          <Alert 
            severity={result.success ? "success" : "error"}
            sx={{ mt: 2 }}
          >
            {result.message}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={loading}
        >
          {result?.success ? 'Close' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
          onClick={handleSend}
          disabled={loading || !email || !isValidEmail(email) || !selectedFormat}
        >
          {loading ? 'Sending...' : 'Send to Device'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SendToDeviceDialog;