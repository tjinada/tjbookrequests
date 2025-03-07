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
          width: '4px', // Thinner scrollbar
        },
        '::-webkit-scrollbar-track': {
          background: 'rgba(0,0,0,0.03)',
        },
        '::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.15)',
          borderRadius: '4px',
        },
        scrollbarWidth: 'thin',
        /* Critical to let native touch scrolling work */
        touchAction: 'pan-y', 
        position: 'relative',
        pb: { xs: 8, sm: 2 }, // Extra padding at the bottom for bottom nav
        mx: 0,
        px: 0
      }}
      className="main-scroll-container"
    >
      {children}
    </Box>
  );
};

export default ScrollContainer;