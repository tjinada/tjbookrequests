// src/components/layout/Layout.js
import React, { useState, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Sidebar from './Sidebar';
import AuthContext from '../../context/AuthContext';
import BottomNav from './BottomNav';
import ResponsiveAppBar from './ResponsiveAppBar';
import useMediaQuery from '@mui/material/useMediaQuery';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open, isMobile  }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
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
  }),
);

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh'  }}>
      <ResponsiveAppBar 
        toggleSidebar={toggleSidebar}
      />

      {!isMobile && (
        <Sidebar 
          open={sidebarOpen} 
          drawerWidth={drawerWidth}
          isAdmin={user?.role === 'admin'} 
        />
      )}

      <Main 
        open={sidebarOpen} 
        isMobile={isMobile}
        sx={{ 
          pt: { xs: 7, sm: 8 }, // Account for different AppBar heights
        }}
      >
        <Outlet />
      </Main>

      <BottomNav />

    </Box>
  );
};

export default Layout;