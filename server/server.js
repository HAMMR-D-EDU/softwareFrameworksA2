const express = require('express');
const cors = require('cors');
const { loadDataFromDisk } = require('./config/data');

const app = express();

// Middleware
app.use(cors());           // allow :4200 → :3000 during dev
app.use(express.json());   // parse JSON bodies automatically

// Load data on startup
loadDataFromDisk();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const channelRoutes = require('./routes/channels');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');

// Mount routes
app.use('/api', authRoutes);              // /api/login, /api/register, /api/echo
app.use('/api/users', userRoutes);        // /api/users/*
app.use('/api/groups', groupRoutes);      // /api/groups/*
app.use('/api/channels', channelRoutes);  // /api/channels/*
app.use('/admin', adminRoutes);           // /admin/*
app.use('/api/reports', reportRoutes);    // /api/reports

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Express listening on http://localhost:${PORT}`));

