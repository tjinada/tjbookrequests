// src/components/admin/TagManager.js
import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import IconButton from '@mui/material/IconButton';
import api from '../../utils/api';

const TagManager = ({ request, onTagsUpdated }) => {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState(request.readarrTags || []);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    setTags(request.readarrTags || []);
    setNewTag('');
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleNewTagChange = (e) => {
    setNewTag(e.target.value);
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    // Don't add duplicate tags
    if (tags.includes(newTag.trim())) {
      setError('Tag already exists');
      return;
    }

    setTags([...tags, newTag.trim()]);
    setNewTag('');
    setError('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Call API to update tags
      await api.put(`/requests/${request._id}/tags`, { tags });

      // Notify parent component to refresh
      if (onTagsUpdated) {
        onTagsUpdated();
      }

      handleClose();
    } catch (err) {
      setError('Failed to update tags');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <IconButton 
        size="small" 
        color="primary" 
        onClick={handleOpen}
        title="Manage Tags"
      >
        <LocalOfferIcon fontSize="small" />
      </IconButton>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Tags for "{request.title}"</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Add New Tag"
              value={newTag}
              onChange={handleNewTagChange}
              onKeyPress={handleKeyPress}
              error={!!error}
              helperText={error}
              sx={{ mt: 1 }}
            />
            <Button 
              onClick={handleAddTag} 
              variant="outlined" 
              size="small" 
              sx={{ mt: 1 }}
            >
              Add Tag
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
              />
            ))}
            {tags.length === 0 && (
              <Box sx={{ py: 2 }}>
                No tags added yet. Tags will be synced with Readarr.
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Tags'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TagManager;