// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { SearchProvider } from './context/SearchContext';
import { LibraryProvider } from './context/LibraryContext';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/routing/PrivateRoute';
import AdminRoute from './components/routing/AdminRoute';
import Home from './pages/Home';
import Search from './pages/Search';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Requests from './pages/Requests';
import AdminRequests from './pages/AdminRequests';
import CalibreManager from './pages/CalibreManager';
import BookDetail from './pages/BookDetail';
import Library from './pages/Library';
import BookReader from './components/library/BookReader';
import InstallPrompt from './components/common/InstallPrompt';
import UpdateNotification from './components/common/UpdateNotification';
import SwipeTutorial from './components/common/SwipeTutorial';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <SearchProvider>
            <LibraryProvider>
              <Router>
                <CssBaseline />
                <InstallPrompt />
                <UpdateNotification />
                <SwipeTutorial />
                <Routes>
                  {/* Standalone routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/read/:bookId/:format?" element={<BookReader />} />

                  {/* Routes within main layout */}
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="search" element={<Search />} />
                    <Route path="book/:id/:source?" element={<BookDetail />} />
                    <Route 
                      path="requests" 
                      element={
                        <PrivateRoute>
                          <Requests />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="profile" 
                      element={
                        <PrivateRoute>
                          <Profile />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="library" 
                      element={
                        <PrivateRoute>
                          <Library />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="admin/requests" 
                      element={
                        <AdminRoute>
                          <AdminRequests />
                        </AdminRoute>
                      } 
                    />
                    <Route 
                      path="calibre-manager" 
                      element={
                        <AdminRoute>
                          <CalibreManager />
                        </AdminRoute>
                      } 
                    />
                  </Route>
                </Routes>
              </Router>
            </LibraryProvider>
          </SearchProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;