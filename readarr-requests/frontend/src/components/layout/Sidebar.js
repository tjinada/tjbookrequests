// src/components/layout/Sidebar.js
import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import AuthContext from '../../context/AuthContext';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';

const Sidebar = ({ open, drawerWidth }) => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const isAdmin = user && user.role === 'admin';

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Search Books', icon: <SearchIcon />, path: '/search' },
    { text: 'My Requests', icon: <HistoryIcon />, path: '/requests' },
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
  ];

  const adminItems = [
    { text: 'Manage Requests', icon: <AdminPanelSettingsIcon />, path: '/admin/requests' },
    { text: 'Calibre Manager', icon: <LocalLibraryIcon />, path: '/calibre-manager' },
  ];

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          top: { xs: 56, sm: 64 }, // Account for AppBar height
          height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 64px)' }
        },
      }}
      variant="persistent"
      anchor="left"
      open={open}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div">
          Navigation
        </Typography>
      </Box>

      <Divider />

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {isAdmin && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" component="div">
              Admin
            </Typography>
          </Box>
          <List>
            {adminItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Drawer>
  );
};

export default Sidebar;