// src/components/reader/ReaderSettings.js
import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Slider,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';
import FormatLineSpacingIcon from '@mui/icons-material/FormatLineSpacing';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import InvertColorsIcon from '@mui/icons-material/InvertColors';

const ReaderSettings = ({
  open,
  onClose,
  fontSize,
  setFontSize,
  theme: readerTheme,
  setTheme: setReaderTheme,
  fontFamily,
  setFontFamily,
  lineSpacing,
  setLineSpacing
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Font size change handler
  const handleFontSizeChange = (event, newValue) => {
    setFontSize(newValue);
    // Save to localStorage
    localStorage.setItem('reader_fontSize', newValue);
  };
  
  // Line spacing change handler
  const handleLineSpacingChange = (event, newValue) => {
    setLineSpacing(newValue);
    // Save to localStorage
    localStorage.setItem('reader_lineSpacing', newValue);
  };
  
  // Theme change handler
  const handleThemeChange = (event, newTheme) => {
    // Don't allow deselecting the theme
    if (newTheme === null) return;
    
    setReaderTheme(newTheme);
    // Save to localStorage
    localStorage.setItem('reader_theme', newTheme);
  };
  
  // Font family change handler
  const handleFontFamilyChange = (event) => {
    setFontFamily(event.target.value);
    // Save to localStorage
    localStorage.setItem('reader_fontFamily', event.target.value);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '85%', sm: 350 } }
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Reader Settings</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Font Size Control */}
        <Box sx={{ mb: 4 }}>
          <Typography id="font-size-slider" gutterBottom>
            Font Size
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextDecreaseIcon sx={{ mr: 2 }} />
            <Slider
              aria-labelledby="font-size-slider"
              value={fontSize}
              onChange={handleFontSizeChange}
              min={80}
              max={180}
              step={5}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
            />
            <TextIncreaseIcon sx={{ ml: 2 }} />
          </Box>
        </Box>
        
        {/* Line Spacing Control */}
        <Box sx={{ mb: 4 }}>
          <Typography id="line-spacing-slider" gutterBottom>
            Line Spacing
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormatLineSpacingIcon sx={{ mr: 2, transform: 'rotate(180deg)' }} />
            <Slider
              aria-labelledby="line-spacing-slider"
              value={lineSpacing}
              onChange={handleLineSpacingChange}
              min={1}
              max={2}
              step={0.1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}`}
            />
            <FormatLineSpacingIcon sx={{ ml: 2 }} />
          </Box>
        </Box>
        
        {/* Theme Selection */}
        <Box sx={{ mb: 4 }}>
          <Typography gutterBottom>Theme</Typography>
          <ToggleButtonGroup
            value={readerTheme}
            exclusive
            onChange={handleThemeChange}
            aria-label="reader theme"
            fullWidth
          >
            <ToggleButton value="light" aria-label="light theme">
              <Brightness7Icon sx={{ mr: 1 }} />
              Light
            </ToggleButton>
            <ToggleButton value="sepia" aria-label="sepia theme">
              <InvertColorsIcon sx={{ mr: 1 }} />
              Sepia
            </ToggleButton>
            <ToggleButton value="dark" aria-label="dark theme">
              <Brightness4Icon sx={{ mr: 1 }} />
              Dark
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        {/* Font Family Selection */}
        <Box sx={{ mb: 4 }}>
          <FormControl fullWidth>
            <InputLabel id="font-family-select-label">Font Family</InputLabel>
            <Select
              labelId="font-family-select-label"
              id="font-family-select"
              value={fontFamily}
              label="Font Family"
              onChange={handleFontFamilyChange}
            >
              <MenuItem value="serif">Serif</MenuItem>
              <MenuItem value="sans-serif">Sans-serif</MenuItem>
              <MenuItem value="Georgia, serif">Georgia</MenuItem>
              <MenuItem value="'Palatino Linotype', 'Book Antiqua', Palatino, serif">Palatino</MenuItem>
              <MenuItem value="'Times New Roman', Times, serif">Times New Roman</MenuItem>
              <MenuItem value="Arial, sans-serif">Arial</MenuItem>
              <MenuItem value="'Lucida Sans Unicode', 'Lucida Grande', sans-serif">Lucida</MenuItem>
              <MenuItem value="Tahoma, sans-serif">Tahoma</MenuItem>
              <MenuItem value="'Trebuchet MS', sans-serif">Trebuchet</MenuItem>
              <MenuItem value="Verdana, sans-serif">Verdana</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Settings are automatically saved and will be remembered for all books.
        </Typography>
      </Box>
    </Drawer>
  );
};

export default ReaderSettings;