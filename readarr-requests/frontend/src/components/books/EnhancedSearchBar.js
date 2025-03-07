import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Popper from '@mui/material/Popper';
import Grow from '@mui/material/Grow';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import api from '../../utils/api';

const EnhancedSearchBar = ({ 
  value, 
  onChange, 
  onSubmit, 
  onClear, 
  placeholder = "Search for books...",
  onSearchTermSelected = null
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  // Fetch suggestions when input changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.length < 3) {
        setSuggestions([]);
        return;
      }
      
      try {
        setLoading(true);
        
        // Use a lightweight API endpoint for getting suggestions
        // This is a simplified example - you would need to implement this endpoint
        const response = await api.get('/search/suggestions', {
          params: { query: value, limit: 5 }
        });
        
        setSuggestions(response.data || []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce the suggestions request
    const timerId = setTimeout(() => {
      fetchSuggestions();
    }, 300);
    
    return () => clearTimeout(timerId);
  }, [value]);
  
  // Handle input element reference for popper positioning
  const handleInputRef = (element) => {
    if (element !== null) {
      setAnchorEl(element);
    }
  };
  
  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    if (onSearchTermSelected) {
      onSearchTermSelected(suggestion);
    } else {
      // Default behavior is to update the search value and submit
      onChange({ target: { value: suggestion } });
      setSuggestions([]);
      // Submit the search with the suggestion
      onSubmit();
    }
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    // Up arrow
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev <= 0 ? suggestions.length - 1 : prev - 1
      );
    }
    // Down arrow
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev >= suggestions.length - 1 ? 0 : prev + 1
      );
    }
    // Enter key
    else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSuggestionClick(suggestions[highlightedIndex]);
      } else {
        // Normal form submission
        onSubmit(e);
      }
    }
    // Escape key
    else if (e.key === 'Escape') {
      setSuggestions([]);
      setHighlightedIndex(-1);
    }
  };
  
  return (
    <ClickAwayListener onClickAway={() => setSuggestions([])}>
      <div style={{ position: 'relative', width: '100%' }}>
        <Paper
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(e);
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
            onKeyDown={handleKeyDown}
            inputRef={handleInputRef}
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
        
        {/* Suggestions dropdown */}
        <Popper
          open={suggestions.length > 0}
          anchorEl={anchorEl}
          placement="bottom-start"
          transition
          style={{ width: anchorEl?.offsetWidth || 'auto', zIndex: 1300 }}
        >
          {({ TransitionProps }) => (
            <Grow {...TransitionProps}>
              <Paper elevation={3} sx={{ mt: 1 }}>
                <List dense>
                  {suggestions.map((suggestion, index) => (
                    <ListItem
                      button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      selected={index === highlightedIndex}
                      sx={{
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemText primary={suggestion} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grow>
          )}
        </Popper>
      </div>
    </ClickAwayListener>
  );
};

export default EnhancedSearchBar;