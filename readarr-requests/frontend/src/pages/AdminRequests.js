// src/pages/AdminRequests.js
import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';
import StatusChecker from '../components/admin/StatusChecker';

const statusColors = {
  pending: 'warning',
  approved: 'info',
  denied: 'error',
  available: 'success'
};

const readarrStatusColors = {
  pending: 'default',
  added: 'info',
  downloaded: 'success',
  error: 'error'
};

// Component to show Readarr status details
const ReadarrStatusDetails = ({ request }) => {
  const [open, setOpen] = useState(false);
  
  const handleClick = () => {
    setOpen(true);
  };
  
  const handleClose = () => {
    setOpen(false);
  };
  
  return (
    <>
      <Tooltip title="View Readarr Details">
        <IconButton size="small" onClick={handleClick}>
          <InfoIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Readarr Integration Details
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            {request.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            by {request.author}
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Status: 
              <Chip 
                size="small" 
                label={request.readarrStatus} 
                color={readarrStatusColors[request.readarrStatus]}
                sx={{ ml: 1 }}
              />
            </Typography>
            
            {request.readarrId && (
              <Typography variant="body2" gutterBottom>
                Readarr ID: {request.readarrId}
              </Typography>
            )}
            
            {request.readarrMessage && (
              <Typography 
                variant="body2" 
                color={request.readarrStatus === 'error' ? 'error' : 'text.primary'}
                sx={{ mt: 1, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}
              >
                {request.readarrMessage}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const AdminRequests = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [updateLoading, setUpdateLoading] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true); // Default to true, will check in useEffect

  // Load requests
  const fetchRequests = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/requests');
      setRequests(res.data);
      setRefreshing(false);
    } catch (err) {
      setError('Failed to load requests');
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Check if user is admin
    if (user && user.role !== 'admin') {
      setIsAdmin(false);
      return; // Return early but don't exit the function altogether
    }

    fetchRequests();
    setLoading(false);
  }, [user]);

  // If not admin, redirect to home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterClick = (event) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleFilterSelect = (filter) => {
    setStatusFilter(filter);
    setFilterMenuAnchor(null);
    setPage(0);
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    setUpdateLoading(prev => ({ ...prev, [requestId]: true }));

    try {
      const res = await api.put(`/requests/${requestId}`, { status: newStatus });

      // Update the requests array with the updated request
      setRequests(requests.map(req => 
        req._id === requestId ? res.data : req
      ));

      setUpdateLoading(prev => ({ ...prev, [requestId]: false }));
    } catch (err) {
      setError('Failed to update request status');
      setUpdateLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Filter requests based on selected status
  const filteredRequests = requests.filter(request => 
    statusFilter === 'all' ? true : request.status === statusFilter
  );

  // Paginate the filtered requests
  const paginatedRequests = filteredRequests.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Book Requests
      </Typography>

      <StatusChecker onStatusChecked={fetchRequests} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          startIcon={<FilterListIcon />}
          onClick={handleFilterClick}
          variant="outlined"
        >
          Filter: {statusFilter === 'all' ? 'All Requests' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
        </Button>

        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchRequests}
          variant="outlined"
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>

        <Menu
          anchorEl={filterMenuAnchor}
          open={Boolean(filterMenuAnchor)}
          onClose={handleFilterClose}
        >
          <MenuItem 
            onClick={() => handleFilterSelect('all')}
            selected={statusFilter === 'all'}
          >
            All Requests
          </MenuItem>
          <MenuItem 
            onClick={() => handleFilterSelect('pending')}
            selected={statusFilter === 'pending'}
          >
            Pending
          </MenuItem>
          <MenuItem 
            onClick={() => handleFilterSelect('approved')}
            selected={statusFilter === 'approved'}
          >
            Approved
          </MenuItem>
          <MenuItem 
            onClick={() => handleFilterSelect('available')}
            selected={statusFilter === 'available'}
          >
            Available
          </MenuItem>
          <MenuItem 
            onClick={() => handleFilterSelect('denied')}
            selected={statusFilter === 'denied'}
          >
            Denied
          </MenuItem>
        </Menu>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 700 }} aria-label="requests table">
            <TableHead>
              <TableRow>
                <TableCell>Book</TableCell>
                <TableCell>Requested By</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Readarr Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRequests.length > 0 ? (
                paginatedRequests.map((request) => (
                  <TableRow key={request._id} hover>
                    <TableCell component="th" scope="row">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          variant="rounded" 
                          src={request.cover} 
                          alt={request.title} 
                          sx={{ width: 50, height: 70, mr: 2 }}
                        />
                        <Box>
                          <Typography variant="body1">{request.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {request.author}
                          </Typography>
                          {request.source && (
                            <Chip 
                              size="small" 
                              label={request.source === 'google' ? 'Google Books' : 'Open Library'} 
                              sx={{ mt: 0.5, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {request.user?.username || 'Unknown User'}
                    </TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={request.status} 
                        color={statusColors[request.status]} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip 
                          label={request.readarrStatus} 
                          color={readarrStatusColors[request.readarrStatus]} 
                          size="small" 
                          sx={{ mr: 1 }}
                        />
                        {(request.readarrStatus === 'added' || request.readarrStatus === 'error') && (
                          <ReadarrStatusDetails request={request} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {request.status === 'pending' && (
                        <Box>
                          <Button
                            startIcon={<CheckCircleIcon />}
                            color="primary"
                            size="small"
                            sx={{ mr: 1 }}
                            onClick={() => handleUpdateStatus(request._id, 'approved')}
                            disabled={updateLoading[request._id]}
                          >
                            Approve
                          </Button>
                          <Button
                            startIcon={<CancelIcon />}
                            color="error"
                            size="small"
                            onClick={() => handleUpdateStatus(request._id, 'denied')}
                            disabled={updateLoading[request._id]}
                          >
                            Deny
                          </Button>
                        </Box>
                      )}
                      {request.status === 'approved' && request.readarrStatus !== 'error' && (
                        <Button
                          startIcon={<LibraryAddCheckIcon />}
                          color="success"
                          size="small"
                          onClick={() => handleUpdateStatus(request._id, 'available')}
                          disabled={updateLoading[request._id]}
                        >
                          Mark Available
                        </Button>
                      )}
                      {request.readarrStatus === 'error' && (
                        <Tooltip title="Retry approval process">
                          <Button
                            startIcon={<RefreshIcon />}
                            color="warning"
                            size="small"
                            onClick={() => handleUpdateStatus(request._id, 'approved')}
                            disabled={updateLoading[request._id]}
                          >
                            Retry
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography sx={{ py: 2 }}>
                      No requests found with the selected filter.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRequests.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Help panel for status meanings */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <HelpOutlineIcon sx={{ mr: 1 }} />
          Status Guide
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Request Status:</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Chip size="small" label="Pending" color="warning" />
              <Chip size="small" label="Approved" color="info" />
              <Chip size="small" label="Available" color="success" />
              <Chip size="small" label="Denied" color="error" />
            </Box>
          </Box>
          
          <Box>
            <Typography variant="subtitle2" gutterBottom>Readarr Status:</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Chip size="small" label="pending" color="default" />
              <Chip size="small" label="added" color="info" />
              <Chip size="small" label="downloaded" color="success" />
              <Chip size="small" label="error" color="error" />
            </Box>
          </Box>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Workflow:</Typography>
            <Typography variant="body2">
              1. When you approve a request, the system searches for the author in Readarr
            </Typography>
            <Typography variant="body2">
              2. If the author exists, it checks for the book and triggers a search
            </Typography>
            <Typography variant="body2">
              3. If the author doesn't exist, it adds the author and the book, then triggers a search
            </Typography>
            <Typography variant="body2">
              4. The status checker periodically checks if books have been downloaded
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminRequests;