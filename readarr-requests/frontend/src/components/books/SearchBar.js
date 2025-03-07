// src/components/books/SearchBar.js
import React from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

const SearchBar = ({ value, onChange, onSubmit, onClear, placeholder = "Search for books..." }) => {
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
      }}
      elevation={1}
    >
      <IconButton type="submit" sx={{ p: '10px' }} aria-label="search">
        <SearchIcon />
      </IconButton>
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder={placeholder}
        inputProps={{ 'aria-label': 'search books' }}
        value={value}
        onChange={onChange}
      />
      {value && (
        <IconButton 
          sx={{ p: '10px' }} 
          aria-label="clear"
          onClick={onClear}
        >
          <ClearIcon />
        </IconButton>
      )}
    </Paper>
  );
};

export default SearchBar;