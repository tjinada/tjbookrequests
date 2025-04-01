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
  Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../utils/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    newUsers: 0,
    activeUsers: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

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

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
    fetchUserStats();
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

  // Handle search term change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
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
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="h4" color="primary" gutterBottom>
                {loadingStats ? <CircularProgress size={24} /> : stats.totalUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="h4" color="secondary" gutterBottom>
                {loadingStats ? <CircularProgress size={24} /> : stats.adminUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Admin Users
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="h4" color="success.main" gutterBottom>
                {loadingStats ? <CircularProgress size={24} /> : stats.newUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New Users (30 days)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Typography variant="h4" color="info.main" gutterBottom>
                {loadingStats ? <CircularProgress size={24} /> : stats.activeUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
            </Paper>
          </Grid>
        </Grid>
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
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
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
                  <TableCell align="right">
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
                <TableCell colSpan={6} align="center">
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