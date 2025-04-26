// src/components/common/ForceUpdateButton.js
import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import { forceUpdatePWA } from '../../utils/pwaRecovery';

/**
 * A button that triggers a force update of the PWA.
 * Can be placed in settings, profile, or any location where users might need it.
 */
const ForceUpdateButton = ({ variant = 'text', color = 'primary', size = 'medium' }) => {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleUpdate = () => {
    setUpdating(true);
    forceUpdatePWA()
      .catch(error => {
        console.error('Error during forced update:', error);
        // If there's an error, the page won't reload, so we need to reset the state
        setUpdating(false);
        setOpen(false);
      });
    
    // We don't need to handle success since the page will reload
  };

  return (
    <>
      <Button
        variant={variant}
        color={color}
        size={size}
        startIcon={<RefreshIcon />}
        onClick={handleClickOpen}
      >
        Refresh App
      </Button>
      
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="force-update-dialog-title"
        aria-describedby="force-update-dialog-description"
      >
        <DialogTitle id="force-update-dialog-title">
          Refresh Application
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="force-update-dialog-description">
            This will clear the app cache and reload with the latest version. If you're having issues with the app, this might help.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary" disabled={updating}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            color="primary" 
            variant="contained"
            disabled={updating}
            startIcon={updating ? <CircularProgress size={20} /> : <RefreshIcon />}
          >
            {updating ? 'Refreshing...' : 'Refresh Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ForceUpdateButton;
