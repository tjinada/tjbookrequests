// src/components/layout/Layout.js
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import CssBaseline from '@mui/material/CssBaseline';
import ResponsiveAppBar from './ResponsiveAppBar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import ScrollContainer from './ScrollContainer';

const drawerWidth = 240;

// Modify Main component to better handle scrolling
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open, isMobile }) => ({
    flexGrow: 1,
    padding: 0, // Remove default padding, let components control their own padding
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: isMobile ? 0 : `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
    height: '100%',
    '@supports (padding: max(0px))': {
      paddingBottom: isMobile ? 
        `max(${theme.spacing(8)}, env(safe-area-inset-bottom))` : 
        theme.spacing(3)
    }
  }),
);

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <CssBaseline />

      <ResponsiveAppBar toggleSidebar={toggleSidebar} />

      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1,
        overflow: 'hidden'
      }}>
        {!isMobile && (
          <Sidebar 
            open={sidebarOpen} 
            drawerWidth={drawerWidth}
          />
        )}

        <Main 
          open={sidebarOpen} 
          isMobile={isMobile}
          sx={{ 
            pt: { xs: 7, sm: 8 }, // Account for different AppBar heights
            // Use container-query margin for full-bleed scrolling area but centered content
            mx: "auto",
            width: "100%",
            maxWidth: "100%"
          }}
        >
          <ScrollContainer>
            <Outlet />
          </ScrollContainer>
        </Main>
      </Box>

      <BottomNav />
    </Box>
  );
};

export default Layout;