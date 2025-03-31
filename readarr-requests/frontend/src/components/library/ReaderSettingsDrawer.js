// src/components/library/ReaderSettingsDrawer.js
import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Slider,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  FormGroup,
  FormControlLabel,
  Switch
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import TextFormatIcon from '@mui/icons-material/TextFormat';

const ReaderSettingsDrawer = ({ 
  open, 
  onClose, 
  fontSize = 100,
  onFontSizeChange,
  theme = 'light',
  onThemeChange,
  paginated = true,
  onPaginatedChange,
  fontFamily = 'serif',
  onFontFamilyChange,
  lineSpacing = 1.5,
  onLineSpacingChange,
  margin = 20,
  onMarginChange,
  onResetSettings
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '80%', sm: 300 } }
      }}
    >
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        <Typography variant="h6">Reader Settings</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      {/* Theme Selection */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Theme
        </Typography>
        
        <ToggleButtonGroup
          value={theme}
          exclusive
          onChange={(e, newTheme) => {
            if (newTheme !== null) {
              onThemeChange(newTheme);
            }
          }}
          aria-label="reader theme"
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value="light" aria-label="light theme">
            <Brightness7Icon sx={{ mr: 1 }} />
            Light
          </ToggleButton>
          <ToggleButton value="sepia" aria-label="sepia theme">
            <TextFormatIcon sx={{ mr: 1 }} />
            Sepia
          </ToggleButton>
          <ToggleButton value="dark" aria-label="dark theme">
            <Brightness4Icon sx={{ mr: 1 }} />
            Dark
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Divider />
      
      {/* Font Size */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom display="flex" alignItems="center">
          <FormatSizeIcon sx={{ mr: 1 }} /> Font Size
        </Typography>
        
        <Box sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ mr: 2 }}>A</Typography>
          <Slider
            value={fontSize}
            min={50}
            max={200}
            step={10}
            onChange={(e, value) => onFontSizeChange(value)}
            aria-labelledby="font-size-slider"
            valueLabelDisplay="auto"
            valueLabelFormat={value => `${value}%`}
          />
          <Typography variant="body1" sx={{ ml: 2 }}>A</Typography>
        </Box>
      </Box>
      
      <Divider />
      
      {/* Font Family */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Font Family
        </Typography>
        
        <ToggleButtonGroup
          value={fontFamily}
          exclusive
          onChange={(e, newFont) => {
            if (newFont !== null) {
              onFontFamilyChange(newFont);
            }
          }}
          aria-label="font family"
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value="serif" aria-label="serif font">
            Serif
          </ToggleButton>
          <ToggleButton value="sans-serif" aria-label="sans-serif font">
            Sans
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Divider />
      
      {/* Line Spacing */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Line Spacing
        </Typography>
        
        <Slider
          value={lineSpacing}
          min={1}
          max={3}
          step={0.1}
          onChange={(e, value) => onLineSpacingChange(value)}
          aria-labelledby="line-spacing-slider"
          valueLabelDisplay="auto"
        />
      </Box>
      
      <Divider />
      
      {/* Display Mode */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Display Mode
        </Typography>
        
        <FormGroup>
          <FormControlLabel 
            control={
              <Switch 
                checked={paginated} 
                onChange={(e) => onPaginatedChange(e.target.checked)} 
              />
            } 
            label="Paginated View" 
          />
        </FormGroup>
      </Box>
      
      <Divider />
      
      {/* Reset Button */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="outlined" 
          color="secondary"
          onClick={onResetSettings}
        >
          Reset to Defaults
        </Button>
      </Box>
    </Drawer>
  );
};

export default ReaderSettingsDrawer;