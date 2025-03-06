// src/components/common/EmptyState.js
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionText, 
  onAction 
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2,
        textAlign: 'center',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(255,255,255,0.03)' 
          : 'rgba(0,0,0,0.02)',
        borderRadius: 2,
      }}
    >
      {Icon && (
        <Icon 
          sx={{ 
            fontSize: 64, 
            color: 'primary.main',
            mb: 2,
            opacity: 0.8
          }} 
        />
      )}

      <Typography 
        variant="h6" 
        component="h3" 
        gutterBottom
        sx={{ fontWeight: 600 }}
      >
        {title}
      </Typography>

      {description && (
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 400 }}
        >
          {description}
        </Typography>
      )}

      {actionText && onAction && (
        <Button 
          variant="contained" 
          onClick={onAction}
          sx={{
            px: 4,
            py: 1,
            borderRadius: 3,
          }}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;