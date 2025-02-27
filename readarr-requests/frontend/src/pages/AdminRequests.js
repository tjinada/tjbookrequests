// src/pages/AdminRequests.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
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
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';

// Import the components we need
import StatusChecker from '../components/admin/StatusChecker';
import TagManager from '../components/admin/TagManager';

const statusColors = {
  pending: 'warning',
  approved: 'info',
  denied: 'error',
  available: 'success'
};

const AdminRequests = () => {
  // Move the context usage to the top level
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [updateLoading, setUpdateLoading] = useState({});

  // Define fetchRequests function at the top level
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/requests');
      setRequests(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load requests');
      setLoading(false);
    }
  }, []);

  // Load requests on initial render
  useEffect(() => {
    // Only fetch if the user is an admin
    if (user && user.role === 'admin') {
      fetchRequests();
    }
  }, [fetchRequests, user]);

  // Define all other handlers at the top level
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
      await api.put(`/requests/${requestId}`, { status: newStatus });

      // Update the requests array with the updated request
      fetchRequests(); // Refresh all requests to get latest data

      setUpdateLoading(prev => ({ ...prev, [requestId]: false }));
    } catch (err) {
      setError('Failed to update request status');
      setUpdateLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Check if user is admin AFTER all hooks are called
  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

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

      <StatusChecker onStatusUpdated={fetchRequests} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
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

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="requests table">
          <TableHead>
            <TableRow>
              <TableCell>Book</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRequests.length > 0 ? (
              paginatedRequests.map((request) => (
                <TableRow key={request._id}>
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
                    {request.readarrTags && request.readarrTags.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {request.readarrTags.map((tag, index) => (
                          <Chip 
                            key={index} 
                            label={tag} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No tags
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {/* Tag Manager */}
                    <TagManager 
                      request={request} 
                      onTagsUpdated={fetchRequests} 
                    />

                    {/* Status Update Buttons */}
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
                    {request.status === 'approved' && (
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
    </Box>
  );
};

export default AdminRequests;