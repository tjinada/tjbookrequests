// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ThemeContext } from './context/ThemeContext';

// Layout Components
import Layout from './components/layout/Layout';

// Page Components
import Home from './pages/Home';
import Search from './pages/Search';
import BookDetail from './pages/BookDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Requests from './pages/Requests';
import AdminRequests from './pages/AdminRequests';
import CalibreManager from './pages/CalibreManager'; // New page

// Utils
import PrivateRoute from './components/routing/PrivateRoute';
import AdminRoute from './components/routing/AdminRoute';

function App() {
  const { theme } = React.useContext(ThemeContext);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Public Routes */}
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route path="search" element={
                <PrivateRoute>
                  <Search />
                </PrivateRoute>
              } />
              <Route path="book/:id" element={
                <PrivateRoute>
                  <BookDetail />
                </PrivateRoute>
              } />
              <Route path="requests" element={
                <PrivateRoute>
                  <Requests />
                </PrivateRoute>
              } />
              <Route path="profile" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="admin/requests" element={
                <AdminRoute>
                  <AdminRequests />
                </AdminRoute>
              } />
              <Route path="calibre-manager" element={
                <AdminRoute>
                  <CalibreManager />
                </AdminRoute>
              } />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;