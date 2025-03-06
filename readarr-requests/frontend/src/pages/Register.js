// src/pages/Register.js
import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import AuthContext from '../context/AuthContext';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showError, setShowError] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);

  const { register, isAuthenticated, error, clearError } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated) {
      navigate('/');
    }

    if (error) {
      setShowError(true);
    }
  }, [isAuthenticated, navigate, error]);

  const { username, email, password, confirmPassword } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    if (e.target.name === 'confirmPassword' || e.target.name === 'password') {
      if (e.target.name === 'password') {
        setPasswordMatch(e.target.value === confirmPassword);
      } else {
        setPasswordMatch(password === e.target.value);
      }
    }

    if (showError) {
      clearError();
      setShowError(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setPasswordMatch(false);
      return;
    }

    const success = await register({
      username,
      email,
      password
    });

    if (success) {
      navigate('/');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 8, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <LibraryBooksIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography component="h1" variant="h5">
              Readarr Requests
            </Typography>
          </Box>

          <Typography component="h1" variant="h6">
            Sign up
          </Typography>

          {showError && (
            <Alert 
              severity="error" 
              sx={{ width: '100%', mt: 2 }}
              onClose={() => {
                clearError();
                setShowError(false);
              }}
            >
              {error}
            </Alert>
          )}

          {!passwordMatch && (
            <Alert 
              severity="error" 
              sx={{ width: '100%', mt: 2 }}
              onClose={() => setPasswordMatch(true)}
            >
              Passwords do not match
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={onChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={email}
              onChange={onChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={onChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={onChange}
              error={!passwordMatch}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign Up
            </Button>
            <Grid container justifyContent="flex-end">
              <Grid item>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    Already have an account? Sign in
                  </Typography>
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;