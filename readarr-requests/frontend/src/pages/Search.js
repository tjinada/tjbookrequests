// src/pages/Search.js
import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import Pagination from '@mui/material/Pagination';
import api from '../utils/api';
import BookCard from '../components/books/BookCard';

const Search = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const booksPerPage = 12;

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/books/search?query=${query}`);
      setSearchResults(res.data);
      setLoading(false);
      setHasSearched(true);
      setPage(1);
    } catch (err) {
      setError('Failed to search books. Please try again.');
      setLoading(false);
    }
  };

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo(0, 0);
  };

  const paginatedResults = searchResults.slice(
    (page - 1) * booksPerPage,
    page * booksPerPage
  );

  const totalPages = Math.ceil(searchResults.length / booksPerPage);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Search Books
      </Typography>

      <Box 
        component="form" 
        onSubmit={handleSearch} 
        sx={{ 
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}
      >
        <TextField
          fullWidth
          label="Search books by title, author, or ISBN"
          variant="outlined"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <Button 
          type="submit" 
          variant="contained" 
          startIcon={<SearchIcon />}
          disabled={loading}
          sx={{ 
            height: { sm: 56 },
            whiteSpace: 'nowrap'
          }}
        >
          Search
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      ) : (
        <>
          {searchResults.length > 0 ? (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Found {searchResults.length} results for "{query}"
              </Typography>

              <Grid container spacing={3}>
                {paginatedResults.map((book) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
                    <BookCard book={book} />
                  </Grid>
                ))}
              </Grid>

              {totalPages > 1 && (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    mt: 4,
                    mb: 2
                  }}
                >
                  <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={handlePageChange} 
                    color="primary" 
                  />
                </Box>
              )}
            </>
          ) : (
            hasSearched && (
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h6">
                  No books found for "{query}". Try a different search.
                </Typography>
              </Box>
            )
          )}
        </>
      )}
    </Box>
  );
};

export default Search;