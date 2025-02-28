// src/App.js
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import InstallPrompt from './components/common/InstallPrompt';
import { ThemeProvider } from './context/ThemeContext';

import PrivateRoute from './components/routing/PrivateRoute';
import Layout from './components/layout/Layout';


// Lazy-loaded components
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Requests = lazy(() => import('./pages/Requests'));
const AdminRequests = lazy(() => import('./pages/AdminRequests'));
const Profile = lazy(() => import('./pages/Profile'));


// Loading fallback
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);


// // Create a theme
// const theme = createTheme({
//   palette: {
//     primary: {
//       main: '#2196f3',
//     },
//     secondary: {
//       main: '#f50057',
//     },
//     background: {
//       default: '#f5f5f5',
//       paper: '#ffffff',
//     },
//   },
//   typography: {
//     fontFamily: [
//       'Roboto',
//       'Arial',
//       'sans-serif'
//     ].join(','),
//   },
// });

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <AppProvider>
          <Router>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/book/:id" element={<BookDetail />} />
                  <Route path="/requests" element={<Requests />} />
                  <Route path="/admin/requests" element={<AdminRequests />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/book/google/:id" element={<BookDetail source="google" />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <InstallPrompt />
            </Suspense>
          </Router>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;