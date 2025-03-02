// src/pages/CalibreManager.js
import React, { useState, useEffect, useContext } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Chip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Pagination,
  Grid,
  CircularProgress,
  Alert,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';

const CalibreManager = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBook, setEditingBook] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [editedTags, setEditedTags] = useState([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');

  // Check if user is admin
  const isAdmin = user && user.role === 'admin';

  // Load books on component mount
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchBooks();
    }
  }, [isAuthenticated, isAdmin, pagination.page, sortBy, sortOrder]);

  // Function to fetch books
  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/calibre-manager/books', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          query: searchQuery,
          sortBy,
          sortOrder
        }
      });
      
      setBooks(response.data.books);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError('Failed to fetch books from Calibre. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    // Reset to first page when searching
    setPagination({
      ...pagination,
      page: 1
    });
    fetchBooks();
  };

  // Handle page change
  const handlePageChange = (event, value) => {
    setPagination({
      ...pagination,
      page: value
    });
  };

  // Open edit dialog
  const handleEditClick = (book) => {
    setEditingBook(book);
    setEditedTags([...book.tags]);
    setEditDialogOpen(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Close edit dialog
  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setEditingBook(null);
    setEditedTags([]);
    setTagInput('');
  };

  // Add tag to the list
  const handleAddTag = () => {
    if (tagInput.trim() !== '' && !editedTags.includes(tagInput.trim())) {
      setEditedTags([...editedTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // Add multiple tags from comma-separated input
  const handleAddMultipleTags = () => {
    if (tagInput.trim() !== '') {
      const newTags = tagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '' && !editedTags.includes(tag));
      
      if (newTags.length > 0) {
        setEditedTags([...editedTags, ...newTags]);
        setTagInput('');
      }
    }
  };

  // Remove tag from the list
  const handleDeleteTag = (tagToDelete) => {
    setEditedTags(editedTags.filter(tag => tag !== tagToDelete));
  };

  // Save tags to the book
  const handleSaveTags = async () => {
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      await api.put(`/calibre-manager/books/${editingBook.id}/tags`, {
        tags: editedTags
      });
      
      // Update the book in the list
      setBooks(books.map(book => 
        book.id === editingBook.id ? { ...book, tags: editedTags } : book
      ));
      
      setSaveSuccess(true);
      
      // Close dialog after short delay
      setTimeout(() => {
        handleCloseDialog();
      }, 1500);
    } catch (err) {
      console.error('Error saving tags:', err);
      setSaveError('Failed to save tags. Please try again.');
    }
  };

  // Handle sort change
  const handleSortChange = (field) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to ascending order for new field
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="error">
          Access Denied
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          You must be an admin to access this page.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <LibraryBooksIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
          Calibre Library Manager
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Manage your Calibre library books and tags
        </Typography>
      </Box>

      {/* Search and Filter Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <form onSubmit={handleSearch}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Search Books"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {searchQuery && (
                        <IconButton
                          onClick={() => setSearchQuery('')}
                          edge="end"
                          size="small"
                        >
                          <ClearIcon />
                        </IconButton>
                      )}
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="title">Title</MenuItem>
                  <MenuItem value="author">Author</MenuItem>
                  <MenuItem value="added">Date Added</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Order</InputLabel>
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  label="Order"
                >
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                type="submit"
                startIcon={<SearchIcon />}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Books Table */}
      <Paper sx={{ width: '100%', mb: 3 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="books table" size="small">
            <TableHead>
              <TableRow>
                <TableCell 
                  onClick={() => handleSortChange('title')}
                  sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Title
                  {sortBy === 'title' && (
                    <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </TableCell>
                <TableCell 
                  onClick={() => handleSortChange('author')}
                  sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Author
                  {sortBy === 'author' && (
                    <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tags</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Loading books...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : books.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1">
                      No books found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                books.map((book) => (
                  <TableRow key={book.id} hover>
                    <TableCell>{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>
                      <Box sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 0.5,
                        maxWidth: 300
                      }}>
                        {book.tags && book.tags.length > 0 ? (
                          book.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              variant="outlined"
                            />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No tags
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditClick(book)}
                        title="Edit Tags"
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {!loading && books.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={pagination.pages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Paper>

      {/* Tag Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Tags
          {editingBook && (
            <Typography variant="subtitle1" sx={{ mt: 1 }}>
              {editingBook.title} by {editingBook.author}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Add Tags (comma-separated)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Enter tags, separate with commas"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddMultipleTags();
                  e.preventDefault();
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button 
                      onClick={handleAddMultipleTags} 
                      variant="text"
                      disabled={!tagInput.trim()}
                    >
                      Add
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Current Tags:
            </Typography>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                minHeight: 100, 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1 
              }}
            >
              {editedTags.length > 0 ? (
                editedTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleDeleteTag(tag)}
                    color="primary"
                    variant="outlined"
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No tags added yet
                </Typography>
              )}
            </Paper>
          </Box>

          {saveSuccess && (
            <Alert severity="success">
              Tags saved successfully!
            </Alert>
          )}

          {saveError && (
            <Alert severity="error">
              {saveError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveTags}
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
          >
            Save Tags
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalibreManager;