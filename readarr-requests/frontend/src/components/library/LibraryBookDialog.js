// src/components/library/LibraryBookDialog.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Typography,
  Button,
  Chip,
  Divider
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import noImage from '../../assets/no-image.png';

const LibraryBookDialog = ({ open, onClose, book, onEmailClick }) => {
  const navigate = useNavigate();

  // Check if book has the necessary data
  if (!book) return null;

  // Handle Read button click
  const handleReadClick = () => {
    onClose();
    navigate(`/read/${book.id}/EPUB`);
  };

  // Handle Download button click
  const handleDownloadClick = () => {
    // Use EPUB format if available, otherwise use the first available format
    let downloadFormat = 'EPUB';
    if (book.formats) {
      if (!book.formats.includes('EPUB') && book.formats.length > 0) {
        downloadFormat = book.formats[0];
      }
    }
    
    const downloadUrl = `/api/library/download/${book.id}/${downloadFormat}`;
    window.open(downloadUrl, '_blank');
  };

  // Handle Email button click
  const handleEmailClick = () => {
    onClose();
    if (onEmailClick) {
      onEmailClick(book);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 2,
          backgroundColor: theme => theme.palette.mode === 'dark' ? '#1a1a1a' : '#fff'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          textAlign: 'center', 
          fontWeight: 'bold',
          pb: 1
        }}
      >
        Book Details
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Top action - Read Book button */}
        <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<MenuBookIcon />}
            onClick={handleReadClick}
            size="large"
            sx={{ py: 1.5, borderRadius: 2 }}
          >
            Read Book
          </Button>
        </Box>

        {/* Book information section */}
        <Box sx={{ px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            {/* Book cover */}
            <Box
              component="img"
              src={book.cover || noImage}
              alt={book.title}
              sx={{
                width: 110,
                height: 160,
                objectFit: 'cover',
                objectPosition: 'center top',
                borderRadius: 2,
                border: '1px solid rgba(0,0,0,0.1)'
              }}
            />

            {/* Book metadata */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" component="h2" gutterBottom>
                {book.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                by {book.author}
              </Typography>
              
              {book.publisher && (
                <Typography variant="body2" color="text.secondary">
                  Published: {book.publisher} {book.year && `(${book.year})`}
                </Typography>
              )}

              {book.formats && book.formats.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {book.formats.map(format => (
                    <Chip
                      key={format}
                      label={format}
                      size="small"
                      color={format === 'EPUB' ? 'primary' : 'default'}
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* ISBN if available */}
          {book.isbn && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ISBN: {book.isbn}
            </Typography>
          )}

          {/* Description section */}
          {(book.comments || book.overview || book.description) && (
            <>
              <Divider textAlign="center" sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                  Description
                </Typography>
              </Divider>
              
              <Typography
                variant="body2"
                component="div"
                sx={{
                  maxHeight: 150,
                  overflow: 'auto',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  px: 1
                }}
                dangerouslySetInnerHTML={{
                  __html: book.comments || book.overview || book.description
                }}
              />
            </>
          )}
        </Box>

        {/* Bottom actions - Download and Email */}
        <Box 
          sx={{ 
            display: 'flex', 
            mt: 2, 
            borderTop: '1px solid', 
            borderColor: 'divider',
            backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
          }}
        >
          <Button
            color="inherit"
            onClick={handleDownloadClick}
            sx={{ 
              flex: 1, 
              py: 2,
              borderRadius: 0,
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.05)'
              }
            }}
            startIcon={<DownloadIcon />}
          >
            Download
          </Button>
          
          <Divider orientation="vertical" flexItem />
          
          <Button
            color="inherit"
            onClick={handleEmailClick}
            sx={{ 
              flex: 1, 
              py: 2,
              borderRadius: 0,
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.05)'
              }
            }}
            startIcon={<EmailIcon />}
          >
            Email
          </Button>
        </Box>

        {/* Cancel button (as a faux bottom navigation) */}
        <Box 
          sx={{ 
            borderTop: '1px solid', 
            borderColor: 'divider',
            p: 1.5,
            textAlign: 'center',
            bgcolor: theme => theme.palette.mode === 'dark' ? '#111' : '#f5f5f5'
          }}
        >
          <Button 
            onClick={onClose}
            variant="text"
            color="inherit"
          >
            Cancel
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LibraryBookDialog;