// src/components/library/LibraryFilters.js
import React from 'react';
import {
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Button,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SortIcon from '@mui/icons-material/Sort';

const LibraryFilters = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  sortOption,
  onSortChange,
  tabValue,
  onTabChange,
  categories,
  disabled
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <>
      {/* Search input */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by title, author, or tag..."
          value={searchTerm}
          onChange={onSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton onClick={onClearSearch} size="small" edge="end">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          size={isMobile ? "small" : "medium"}
          disabled={disabled}
        />
      </Paper>
      
      {/* Category tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={onTabChange}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : false}
          allowScrollButtonsMobile
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            minHeight: isMobile ? 40 : 48
          }}
          indicatorColor="primary"
          textColor="primary"
        >
          {categories.map((category, index) => (
            <Tab 
              key={category.id} 
              label={category.label} 
              sx={{ 
                minHeight: isMobile ? 40 : 48,
                fontSize: isMobile ? '0.8rem' : '0.875rem'
              }}
            />
          ))}
        </Tabs>
      </Paper>
      
      {/* Sort buttons */}
      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        mb: 2, 
        flexWrap: 'wrap',
        justifyContent: isMobile ? 'center' : 'flex-start'
      }}>
        <Button
          variant={sortOption === 'title' ? 'contained' : 'outlined'}
          onClick={() => onSortChange('title')}
          size="small"
          startIcon={<SortIcon />}
          disabled={disabled}
        >
          Title
        </Button>
        
        <Button
          variant={sortOption === 'author' ? 'contained' : 'outlined'}
          onClick={() => onSortChange('author')}
          size="small"
          startIcon={sortOption === 'author' ? <SortIcon /> : null}
          disabled={disabled}
        >
          Author
        </Button>
        
        <Button
          variant={sortOption === 'added' ? 'contained' : 'outlined'}
          onClick={() => onSortChange('added')}
          size="small"
          startIcon={sortOption === 'added' ? <SortIcon /> : null}
          disabled={disabled}
        >
          Recent
        </Button>
      </Box>
    </>
  );
};

export default LibraryFilters;