// src/components/library/LibraryBookActions.js
import React, { useState } from 'react';
import { 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Tooltip
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EmailIcon from '@mui/icons-material/Email';
import DownloadIcon from '@mui/icons-material/Download';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { Link } from 'react-router-dom';
import EmailBookDialog from './EmailBookDialog';

const LibraryBookActions = ({ book }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEmailClick = () => {
    setEmailDialogOpen(true);
    handleMenuClose();
  };

  const handleDownload = () => {
    // Use the first available format, prioritizing EPUB
    const formats = book.formats || [];
    let downloadFormat = formats[0]; // Default to first format
    
    // Prioritize EPUB if available
    if (formats.includes('EPUB')) {
      downloadFormat = 'EPUB';
    }
    
    // Generate download URL
    const downloadUrl = `/api/library/download/${book.id}/${downloadFormat}`;
    
    // Open in new tab
    window.open(downloadUrl, '_blank');
    handleMenuClose();
  };

  return (
    <>
      <Tooltip title="Book Actions">
        <IconButton aria-label="actions" onClick={handleMenuOpen}>
          <MoreVertIcon />
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          component={Link} 
          to={`/read/${book.id}/EPUB`}
          onClick={handleMenuClose}
        >
          <ListItemIcon>
            <MenuBookIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Read Online</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDownload}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleEmailClick}>
          <ListItemIcon>
            <EmailIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Send via Email</ListItemText>
        </MenuItem>
      </Menu>
      
      <EmailBookDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        book={book}
      />
    </>
  );
};

export default LibraryBookActions;