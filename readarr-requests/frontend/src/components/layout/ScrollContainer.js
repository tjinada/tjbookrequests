// src/components/layout/ScrollContainer.js
import React from 'react';
import Box from '@mui/material/Box';

const ScrollContainer = ({ children }) => {
  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        '::-webkit-scrollbar': {
          width: '8px',
        },
        '::-webkit-scrollbar-track': {
          background: 'rgba(0,0,0,0.05)',
        },
        '::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
        },
        scrollbarWidth: 'thin',
        touchAction: 'pan-y',
        position: 'relative',
        pb: { xs: 8, sm: 2 } // Extra padding at the bottom
      }}
    >
      {children}
    </Box>
  );
};

export default ScrollContainer;