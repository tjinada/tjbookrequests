// src/components/books/SearchBar.js - Enhanced version
import React from 'react';
import { 
  Paper, 
  InputBase, 
  IconButton,

  Divider,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import BookIcon from '@mui/icons-material/Book';
import PersonIcon from '@mui/icons-material/Person';

const SearchBar = ({ 
  titleValue = '', 
  authorValue = '', 
  onTitleChange, 
  onAuthorChange, 
  onSubmit, 
  onClear, 
  disabled = false 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Paper
      component="div"
      sx={{
        p: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        borderRadius: 2
      }}
      elevation={1}
    >
      {/* Search Icon */}
      <IconButton 
        type="submit" 
        sx={{ p: '10px' }} 
        aria-label="search"
        onClick={onSubmit}
        disabled={disabled || (!titleValue.trim() && !authorValue.trim())}
      >
        <SearchIcon />
      </IconButton>
      
      {/* Title Input */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        flexGrow: 1,
        width: isMobile ? '100%' : 'auto',
        borderBottom: isMobile ? 1 : 0,
        borderColor: 'divider'
      }}>
        <BookIcon color="action" sx={{ mx: 1, fontSize: '1.2rem' }} />
        <InputBase
          sx={{ 
            ml: 1, 
            flex: 1,
            py: 1
          }}
          placeholder="Book title"
          inputProps={{ 'aria-label': 'search book title' }}
          value={titleValue}
          onChange={onTitleChange}
          disabled={disabled}
        />
        {titleValue && (
          <IconButton 
            size="small" 
            aria-label="clear title"
            onClick={() => onTitleChange({ target: { value: '' } })}
            disabled={disabled}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      
      {/* Divider - visual separator between inputs */}
      {!isMobile && (
        <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
      )}
      
      {/* Author Input */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        flexGrow: 1,
        width: isMobile ? '100%' : 'auto'
      }}>
        <PersonIcon color="action" sx={{ mx: 1, fontSize: '1.2rem' }} />
        <InputBase
          sx={{ 
            ml: 1, 
            flex: 1,
            py: 1
          }}
          placeholder="Author name"
          inputProps={{ 'aria-label': 'search author name' }}
          value={authorValue}
          onChange={onAuthorChange}
          disabled={disabled}
        />
        {authorValue && (
          <IconButton 
            size="small" 
            aria-label="clear author"
            onClick={() => onAuthorChange({ target: { value: '' } })}
            disabled={disabled}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      
      {/* Clear All Button - Show only if either field has content */}
      {(titleValue || authorValue) && (
        <IconButton 
          sx={{ p: '10px' }} 
          aria-label="clear all"
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