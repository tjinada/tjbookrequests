// src/components/layout/BottomNav.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import PersonIcon from '@mui/icons-material/Person';
import { useTheme } from '@mui/material/styles';

const BottomNav = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

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
        borderTop: `1px solid ${
          theme.palette.mode === 'dark' 
            ? 'rgba(255,255,255,0.1)' 
            : 'rgba(0,0,0,0.1)'
        }`,
        background: theme.palette.background.paper,
        backdropFilter: 'blur(10px)',
        // Add safe area padding for iOS
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      elevation={0}
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
        sx={{
          height: 60,
          '& .MuiBottomNavigationAction-root': {
            padding: '6px 0 8px',
            minWidth: 'auto',
            color: theme.palette.text.secondary,
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            },
          },
        }}
      >
        <BottomNavigationAction 
          label="Home" 
          icon={<HomeIcon />} 
        />
        <BottomNavigationAction 
          label="Search" 
          icon={<SearchIcon />} 
        />
        <BottomNavigationAction 
          label="Requests" 
          icon={<BookmarkIcon />} 
        />
        <BottomNavigationAction 
          label="Profile" 
          icon={<PersonIcon />} 
        />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;