// src/components/books/SearchBar.js
import React from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

const SearchBar = ({ value, onChange, onSubmit, onClear }) => {
  return (
    <Paper
      component="form"
      onSubmit={onSubmit}
      sx={{
        p: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        maxWidth: 600,
        mx: 'auto',
        borderRadius: 3,
        backgroundColor: (theme) => 
          theme.palette.mode === 'dark' 
            ? 'rgba(255,255,255,0.05)' 
            : 'rgba(0,0,0,0.03)',
        '&:hover': {
          backgroundColor: (theme) => 
            theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.08)' 
              : 'rgba(0,0,0,0.05)',
        },
      }}
    >
      <IconButton type="submit" sx={{ p: '10px' }} aria-label="search">
        <SearchIcon />
      </IconButton>
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder="Search for books..."
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