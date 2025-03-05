// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const webhookRoutes = require('./routes/webhooks');
const calibreManagerRoutes = require('./routes/calibreManager');
const searchRoutes = require('./routes/search');
const notificationRoutes = require('./routes/notifications');
const googleBooksRoutes = require('./routes/googleBooks');
const recommendationRoutes = require('./routes/recommendations');
const path = require('path');

// Load environment variables
dotenv.config();

// Routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const requestRoutes = require('./routes/requests');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/calibre-manager', calibreManagerRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/google-books', googleBooksRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// For any unrecognized API route, return 404
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Serve React app for all other routes (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));