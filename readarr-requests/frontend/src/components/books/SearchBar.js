// src/components/books/SearchBar.js
import React from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

const SearchBar = ({ 
  titleValue = '', 
  authorValue = '', 
  onTitleChange, 
  onAuthorChange, 
  onSubmit, 
  onClear, 
  disabled = false
}) => {
  return (
    <Paper
      component="form"
      onSubmit={(e) => {
        e.preventDefault(); // Prevent form from actually submitting
        if (onSubmit) onSubmit(e);
      }}
      sx={{
        p: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        flexDirection: { xs: 'column', sm: 'row' }
      }}
      elevation={1}
    >
      {/* Search Icon */}
      <IconButton 
        type="submit" 
        sx={{ p: '10px' }} 
        aria-label="search"
        disabled={disabled || (!titleValue.trim() && !authorValue.trim())}
      >
        <SearchIcon />
      </IconButton>
      
      {/* Title Input */}
      <InputBase
        sx={{ ml: 1, flex: 1, borderBottom: { xs: '1px solid rgba(0, 0, 0, 0.1)', sm: 'none' }, width: { xs: '100%', sm: 'auto' } }}
        placeholder="Book title"
        inputProps={{ 'aria-label': 'search book title' }}
        value={titleValue}
        onChange={onTitleChange}
        disabled={disabled}
      />
      
      {/* Divider - visual separator between inputs */}
      <div style={{ 
        height: '20px', 
        width: '1px', 
        backgroundColor: 'rgba(0, 0, 0, 0.1)', 
        margin: '0 8px',
        display: { xs: 'none', sm: 'block' } 
      }} />
      
      {/* Author Input */}
      <InputBase
        sx={{ ml: 1, flex: 1, width: { xs: '100%', sm: 'auto' } }}
        placeholder="Author name"
        inputProps={{ 'aria-label': 'search author name' }}
        value={authorValue}
        onChange={onAuthorChange}
        disabled={disabled}
      />
      
      {/* Clear Button - Show only if either field has content */}
      {(titleValue || authorValue) && (
        <IconButton 
          sx={{ p: '10px' }} 
          aria-label="clear"
          onClick={onClear}
          disabled={disabled}
        >
          <ClearIcon />
        </IconButton>
      )}
    </Paper>
  );
};

export default SearchBar;