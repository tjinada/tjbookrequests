// src/components/common/EmptyState.js
import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  useTheme
} from '@mui/material';

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  paperProps = {},
  height = 'auto'
}) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(255,255,255,0.03)' 
          : 'rgba(0,0,0,0.02)',
        borderRadius: 2,
        minHeight: height,
        ...paperProps.sx
      }}
      {...paperProps}
    >
      {Icon && (
        <Icon 
          sx={{ 
            fontSize: 70, 
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
    </Paper>
  );
};

export default EmptyState;