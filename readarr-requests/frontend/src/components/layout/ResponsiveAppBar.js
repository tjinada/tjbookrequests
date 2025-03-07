// src/components/layout/ResponsiveAppBar.js
import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import SearchIcon from '@mui/icons-material/Search';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTheme, useMediaQuery } from '@mui/material';
import AuthContext from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';

const ResponsiveAppBar = ({ toggleSidebar }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Home';
    if (path.startsWith('/search')) return 'Search Books';
    if (path.startsWith('/book/')) return 'Book Details';
    if (path.startsWith('/requests')) return 'My Requests';
    if (path.startsWith('/admin/requests')) return 'Manage Requests';
    if (path.startsWith('/calibre-manager')) return 'Calibre Manager';
    if (path.startsWith('/profile')) return 'Profile';
    return 'TJ Book Requests';
  };

  // Navigation items
  const pages = [
    { name: 'Home', path: '/' },
    { name: 'Search', path: '/search' },
    { name: 'My Requests', path: '/requests' }
  ];

  // Admin pages
  const adminPages = user && user.role === 'admin' 
    ? [
        { name: 'Manage Requests', path: '/admin/requests' },
        { name: 'Calibre Manager', path: '/calibre-manager' }
      ] 
    : [];

  // All navigation pages combined
  const allPages = [...pages, ...adminPages];

  // User menu items
  const settings = [
    { name: 'Profile', icon: <AccountCircleIcon fontSize="small" />, action: () => navigate('/profile') },
    { name: 'Logout', icon: <LogoutIcon fontSize="small" />, action: handleLogout }
  ];

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleCloseNavMenu();
  };

  function handleLogout() {
    logout();
    navigate('/login');
    handleCloseUserMenu();
  }

  return (
    <AppBar position="fixed" elevation={1}>
      <Container maxWidth="xl">
        <Toolbar disableGutters variant={isMobile ? "dense" : "regular"}>
          {/* Logo and Menu Icon - Mobile View */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
            <IconButton
              size="large"
              aria-label="menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={isMobile ? handleOpenNavMenu : toggleSidebar}
              color="inherit"
              edge="start"
            >
              <MenuIcon />
            </IconButton>

            <LocalLibraryIcon sx={{ display: { xs: 'flex' }, mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                flexGrow: 1,
                fontWeight: 700,
                letterSpacing: '.1rem',
              }}
            >
              {isMobile ? getPageTitle() : 'READARR'}
            </Typography>
          </Box>

          {/* Logo and Title - Desktop View */}
          <LocalLibraryIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              letterSpacing: '.1rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            TJ Book REQUESTS
          </Typography>

          {/* Mobile Navigation Menu */}
          <Menu
            id="menu-appbar"
            anchorEl={anchorElNav}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            open={Boolean(anchorElNav)}
            onClose={handleCloseNavMenu}
            sx={{
              display: { xs: 'block', md: 'none' },
            }}
          >
            {allPages.map((page) => (
              <MenuItem 
                key={page.name} 
                onClick={() => handleNavigate(page.path)}
                selected={location.pathname === page.path}
              >
                <Typography textAlign="center">{page.name}</Typography>
              </MenuItem>
            ))}
          </Menu>

          {/* Desktop Navigation Links */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {allPages.map((page) => (
              <Button
                key={page.name}
                onClick={() => handleNavigate(page.path)}
                sx={{ 
                  my: 2, 
                  color: 'white', 
                  display: 'block',
                  bgcolor: location.pathname === page.path ? 'rgba(255,255,255,0.15)' : 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.25)',
                  },
                  px: 2
                }}
              >
                {page.name}
              </Button>
            ))}
          </Box>

          {/* Desktop Search Button */}
          {!isMobile && (
            <Button
              variant="outlined"
              startIcon={<SearchIcon />}
              color="inherit"
              onClick={() => navigate('/search')}
              sx={{ 
                mr: 2, 
                display: { xs: 'none', sm: 'flex' },
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                }
              }}
            >
              Search
            </Button>
          )}

          {/* Mobile Search Button */}
          {isMobile && (
            <IconButton
              size="large"
              color="inherit"
              onClick={() => navigate('/search')}
              sx={{ ml: 'auto', mr: 1 }}
            >
              <SearchIcon />
            </IconButton>
          )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeToggle />
            {/* User menu */}
            </Box>

          {/* User Menu */}
          <Box sx={{ flexShrink: 0 }}>
            <Tooltip title="Open user menu">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar 
                  alt={user?.username || 'User'} 
                  src="/static/avatar.jpg" 
                  sx={{ 
                    bgcolor: 'secondary.main',
                    width: isMobile ? 32 : 40,
                    height: isMobile ? 32 : 40
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              {/* User info section */}
              <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {user?.username || 'User'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email || 'user@example.com'}
                </Typography>
              </Box>

              {settings.map((setting) => (
                <MenuItem key={setting.name} onClick={setting.action}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {setting.icon && <Box sx={{ mr: 1 }}>{setting.icon}</Box>}
                    <Typography textAlign="center">{setting.name}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default ResponsiveAppBar;