// src/components/layout/Layout.js
import React, { useState, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import AuthContext from '../../context/AuthContext';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useContext(AuthContext);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Navbar 
        open={sidebarOpen} 
        toggleSidebar={toggleSidebar}
        drawerWidth={drawerWidth} 
      />

      <Sidebar 
        open={sidebarOpen} 
        drawerWidth={drawerWidth} 
        isAdmin={user?.role === 'admin'} 
      />

      <Main open={sidebarOpen}>
        <Box component="div" sx={{ mt: 8, p: 2 }}>
          <Outlet />
        </Box>
      </Main>
    </Box>
  );
};

export default Layout;