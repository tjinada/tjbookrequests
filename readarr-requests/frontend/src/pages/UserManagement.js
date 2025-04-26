// src/pages/UserManagement.js
// Admin page to manage all registered users
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Snackbar,
  Grid,
  Tabs,
  Tab,
  Badge,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewListIcon from '@mui/icons-material/ViewList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import api from '../utils/api';
import { formatDistance } from 'date-fns';

// Helper function to format dates relative to now
const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Never';
  try {
    return formatDistance(new Date(dateString), new Date(), { addSuffix: true });
  } catch (e) {
    return 'Invalid date';
  }
};

// Component to display activity icon based on type
const ActivityIcon = ({ type }) => {
  switch (type) {
    case 'search':
      return <SearchIcon color="primary" />;
    case 'view_book':
      return <VisibilityIcon color="secondary" />;
    case 'reading':
      return <MenuBookIcon color="success" />;
    case 'request_book':
      return <LocalLibraryIcon color="info" />;
    case 'login':
      return <PersonIcon color="action" />;
    default:
      return <AccessTimeIcon />;
  }
};

// User activity details dialog component
const UserActivityDialog = ({ open, handleClose, userId, username }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && userId) {
      fetchUserActivities();
    }
  }, [open, userId]);

  const fetchUserActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/admin/users/${userId}/activities?limit=100`);
      setActivities(response.data.activities);
    } catch (err) {
      console.error('Error fetching user activities:', err);
      setError(err.response?.data?.message || 'Failed to fetch user activities');
    } finally {
      setLoading(false);
    }
  };

  const formatActivityDetails = (activity) => {
    switch (activity.activity) {
      case 'search':
        return `Query: "${activity.details.query}" (Source: ${activity.details.source || 'all'})`;
      case 'view_book':
        return `Viewed: "${activity.details.title}" by ${activity.details.author || 'Unknown'}`;
      case 'reading':
        return `Reading book ID: ${activity.details.bookId}, Page: ${activity.details.page || 1}`;
      case 'request_book':
        return `Requested: "${activity.details.title}" by ${activity.details.author || 'Unknown'}`;
      case 'login':
        return `Logged in (${activity.details.userAgent ? activity.details.userAgent.substring(0, 30) + '...' : 'Unknown device'})`;
      default:
        return JSON.stringify(activity.details);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="user-activity-dialog"
    >
      <DialogTitle id="user-activity-dialog">
        User Activity for {username}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : activities.length === 0 ? (
          <Alert severity="info">No activity records found for this user.</Alert>
        ) : (
          <List>
            {activities.map((activity, index) => (
              <React.Fragment key={activity._id}>
                <ListItem>
                  <ListItemIcon>
                    <ActivityIcon type={activity.activity} />
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.activity.replace('_', ' ').toUpperCase()}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          {formatRelativeTime(activity.timestamp)}
                        </Typography>
                        <br />
                        {formatActivityDetails(activity)}
                      </>
                    }
                  />
                </ListItem>
                {index < activities.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button 
          onClick={fetchUserActivities} 
          color="primary" 
          disabled={loading}
        >
          Refresh
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userActivityDialogOpen, setUserActivityDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    newUsers: 0,
    activeUsers: 0,
    recentlyActiveUsers: 0
  });
  const [activityMetrics, setActivityMetrics] = useState({
    activityMetrics: {},
    topUsers: []
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivityMetrics, setLoadingActivityMetrics] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [tabValue, setTabValue] = useState(0);

  // Fetch user statistics
  const fetchUserStats = async () => {
    setLoadingStats(true);
    try {
      const response = await api.get('/admin/users/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching user statistics:', err);
      // Don't set an error message for stats, just log it
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch activity metrics
  const fetchActivityMetrics = async () => {
    setLoadingActivityMetrics(true);
    try {
      const response = await api.get('/admin/users/activity/metrics');
      setActivityMetrics(response.data);
    } catch (err) {
      console.error('Error fetching activity metrics:', err);
    } finally {
      setLoadingActivityMetrics(false);
    }
  };

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
    fetchUserStats();
    fetchActivityMetrics();
  }, []);

  // Function to fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to refresh all data
  const refreshData = () => {
    fetchUsers();
    fetchUserStats();
    fetchActivityMetrics();
  };

  // Function to handle user deletion
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await api.delete(`/admin/users/${selectedUser._id}`);
      
      // Remove user from state
      setUsers(users.filter(user => user._id !== selectedUser._id));
      
      // Show success message
      setSnackbar({
        open: true,
        message: `User ${selectedUser.username} was successfully deleted`,
        severity: 'success'
      });
    } catch (err) {
      console.error('Error deleting user:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to delete user',
        severity: 'error'
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  // Open user activity dialog
  const openUserActivityDialog = (user) => {
    setSelectedUser(user);
    setUserActivityDialogOpen(true);
  };

  // Close user activity dialog
  const closeUserActivityDialog = () => {
    setUserActivityDialogOpen(false);
  };

  // Handle search term change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user._id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Render loading state
  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Helper function to format activity counts
  const formatActivityCount = (type) => {
    return activityMetrics?.activityMetrics?.[type] || 0;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refreshData}
          disabled={loading || loadingStats}
        >
          Refresh
        </Button>
      </Box>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats cards */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="h4" color="primary" gutterBottom>
                {loadingStats ? <CircularProgress size={24} /> : stats.totalUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="h4" color="secondary" gutterBottom>
                {loadingStats ? <CircularProgress size={24} /> : stats.adminUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Admin Users
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="h4" color="success.main" gutterBottom>
                {loadingStats ? <CircularProgress size={24} /> : stats.newUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New Users (30 days)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="h4" color="info.main" gutterBottom>
                {loadingStats ? <CircularProgress size={24} /> : stats.activeUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Users (w/ Requests)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="h4" color="warning.main" gutterBottom>
                {loadingStats ? <CircularProgress size={24} /> : stats.recentlyActiveUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active (Last 7 Days)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Activities
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loadingActivityMetrics ? (
                  <CircularProgress size={20} />
                ) : (
                  `${Object.values(activityMetrics.activityMetrics || {}).reduce((sum, count) => sum + count, 0)} Total`
                )}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Activity metrics */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Activity Overview
        </Typography>
        {loadingActivityMetrics ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SearchIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="div">
                          {formatActivityCount('search')}
                        </Typography>
                      </Box>
                      <Typography color="text.secondary">
                        Book Searches
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <VisibilityIcon color="secondary" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="div">
                          {formatActivityCount('view_book')}
                        </Typography>
                      </Box>
                      <Typography color="text.secondary">
                        Book Views
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <MenuBookIcon color="success" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="div">
                          {formatActivityCount('reading')}
                        </Typography>
                      </Box>
                      <Typography color="text.secondary">
                        Reading Sessions
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocalLibraryIcon color="info" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="div">
                          {formatActivityCount('request_book')}
                        </Typography>
                      </Box>
                      <Typography color="text.secondary">
                        Book Requests
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon color="action" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="div">
                          {formatActivityCount('login')}
                        </Typography>
                      </Box>
                      <Typography color="text.secondary">
                        User Logins
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                Most Active Users
              </Typography>
              <List>
                {activityMetrics.topUsers?.slice(0, 5).map((user, index) => (
                  <ListItem key={user.userId} disablePadding>
                    <ListItemText 
                      primary={user.username} 
                      secondary={`${user.activityCount} activities`}
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Tabs for different user views */}
      <Box sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="user management tabs"
        >
          <Tab label="All Users" />
          <Tab label="Recently Active" />
          <Tab label="Admins" />
        </Tabs>
      </Box>

      {/* Search box */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by username, email, or ID..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
          }}
        />
      </Paper>

      {/* Users table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>User ID</TableCell>
              <TableCell align="center">Created</TableCell>
              <TableCell align="center">Last Seen</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length > 0 ? (
              // Filter users based on tab selection
              filteredUsers
                .filter(user => {
                  if (tabValue === 0) return true; // All users
                  if (tabValue === 1) { // Recently active (7 days)
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    return new Date(user.lastSeen) >= sevenDaysAgo;
                  }
                  if (tabValue === 2) return user.role === 'admin'; // Admins only
                  return true;
                })
                .map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell component="th" scope="row">
                    {user.username}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role === 'admin' ? (
                      <Chip 
                        icon={<AdminPanelSettingsIcon />} 
                        label="Admin" 
                        color="primary" 
                        size="small"
                      />
                    ) : (
                      <Chip 
                        icon={<PersonIcon />} 
                        label="User" 
                        color="default" 
                        size="small" 
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={user._id}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {user._id.substring(0, 10)}...
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Never'}>
                      <Typography>{formatRelativeTime(user.lastSeen)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Activity">
                      <IconButton 
                        color="primary" 
                        onClick={() => openUserActivityDialog(user)}
                        sx={{ mr: 1 }}
                      >
                        <ViewListIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton 
                        color="error" 
                        onClick={() => openDeleteDialog(user)}
                        disabled={user.role === 'admin'} // Prevent deleting admins
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {loading ? (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  ) : searchTerm ? (
                    'No users match your search'
                  ) : (
                    'No users found'
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
      >
        <DialogTitle>Confirm User Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user <strong>{selectedUser?.username}</strong>? 
            This action cannot be undone, and the user will lose access to all their book requests and settings.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button 
            onClick={handleDeleteUser} 
            color="error" 
            variant="contained"
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* User activity dialog */}
      <UserActivityDialog 
        open={userActivityDialogOpen} 
        handleClose={closeUserActivityDialog} 
        userId={selectedUser?._id}
        username={selectedUser?.username}
      />

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;