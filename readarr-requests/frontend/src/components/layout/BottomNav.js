// src/components/layout/BottomNav.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import PersonIcon from '@mui/icons-material/Person';
import { useMediaQuery, useTheme } from '@mui/material';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Don't render on desktop
  if (!isMobile) return null;

  // Determine active tab from current path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path.startsWith('/search')) return 1;
    if (path.startsWith('/requests')) return 2;
    if (path.startsWith('/profile')) return 3;
    return 0;
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000,
        // Handle iPhone safe areas
        paddingBottom: 'env(safe-area-inset-bottom)'
      }} 
      elevation={3}
    >
      <BottomNavigation
        value={getActiveTab()}
        onChange={(event, newValue) => {
          switch (newValue) {
            case 0: navigate('/'); break;
            case 1: navigate('/search'); break;
            case 2: navigate('/requests'); break;
            case 3: navigate('/profile'); break;
            default: navigate('/');
          }
        }}
        showLabels
      >
        <BottomNavigationAction label="Home" icon={<HomeIcon />} />
        <BottomNavigationAction label="Search" icon={<SearchIcon />} />
        <BottomNavigationAction label="Requests" icon={<BookmarkIcon />} />
        <BottomNavigationAction label="Profile" icon={<PersonIcon />} />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;