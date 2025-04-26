// src/App.js
import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import InstallPrompt from './components/common/InstallPrompt';
import UpdateNotification from './components/common/UpdateNotification';
import { ThemeProvider } from './context/ThemeContext';
import { SearchProvider } from './context/SearchContext';
import PrivateRoute from './components/routing/PrivateRoute';
import Layout from './components/layout/Layout';
import AdminRoute from './components/routing/AdminRoute';
import { LibraryProvider } from './context/LibraryContext';
import Reader from './pages/Reader';
import './pdfjs-worker'; // Initialize PDF.js worker
import { detectWhiteScreen, forceUpdatePWA } from './utils/pwaRecovery';


// Lazy-loaded components
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Requests = lazy(() => import('./pages/Requests'));
const AdminRequests = lazy(() => import('./pages/AdminRequests'));
const Profile = lazy(() => import('./pages/Profile'));
const CalibreManager = lazy(() => import('./pages/CalibreManager'));
const MyLibrary = lazy(() => import('./pages/MyLibrary'));
const BookReader = lazy(() => import('./components/library/BookReader'));
const UserManagement = lazy(() => import('./pages/UserManagement')); // Add this line

// Loading fallback
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

function App() {
  // This effect handles recovery from white screens after the app attempts to load
  useEffect(() => {
    // Check URL for recovery parameter
    const params = new URLSearchParams(window.location.search);
    if (params.has('recovery')) {
      console.log('[App] Recovery mode detected');
      // Clean up URL by removing recovery parameter
      const newUrl = window.location.pathname + 
                   (params.toString() ? '?' + params.toString().replace(/recovery=[^&]+(&|$)/, '') : '');
      window.history.replaceState({}, document.title, newUrl);
    }
    
    // Set a flag to track if the app is fully rendered
    let appRendered = false;
    
    // Mark the app as rendered after a short delay
    const markAsRendered = setTimeout(() => {
      appRendered = true;
    }, 2000);
    
    return () => {
      clearTimeout(markAsRendered);
    };
  }, []);

  return (
    <ThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <AppProvider>
        <SearchProvider>
        <LibraryProvider>
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
                  <Route path="calibre-manager" element={<AdminRoute><CalibreManager /></AdminRoute>} />
                  <Route path="admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} /> {/* Add this line */}
                  <Route path="/library" element={<MyLibrary />} />
                  <Route path="/read/:id/:format" element={<BookReader />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
                <Route path="/read/:id" element={<Reader />} />
                <Route path="/read/:id/:format" element={<Reader />} />
              </Routes>
              <InstallPrompt />
              <UpdateNotification />
            </Suspense>
          </Router>
          </LibraryProvider>
          </SearchProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;