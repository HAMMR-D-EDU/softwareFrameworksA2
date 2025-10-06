import express from 'express';
import https from 'https';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToDatabase, healthCheck, getDb } from './config/db.js';
import { initializeSocket } from './config/socket.js';
import { PeerServer } from 'peer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import groupRoutes from './routes/groups.js';
import channelRoutes from './routes/channels.js';
import adminRoutes from './routes/admin.js';
import reportRoutes from './routes/reports.js';
import uploadRoutes from './routes/uploads.js';

// SSL Certificate options
const options = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
};

const app = express();
const httpsServer = https.createServer(options, app);

// Middleware
app.use(cors({
  origin: ['https://localhost:4200', 'https://localhost:3000', 'http://localhost:4200'],
  credentials: true
}));
app.use(express.json());

// Serve static images
app.use('/images', express.static(path.join(__dirname, './userimages')));

// Mount routes
app.use('/api', authRoutes);              // /api/login, /api/register, /api/echo
app.use('/api/users', userRoutes);        // /api/users/*
app.use('/api/groups', groupRoutes);      // /api/groups/*
app.use('/api/channels', channelRoutes);  // /api/channels/*
app.use('/admin', adminRoutes);           // /admin/*
app.use('/api/reports', reportRoutes);    // /api/reports
app.use('/api', uploadRoutes);            // /api/upload

// Start servers
const PORT = 3000;
const PEER_PORT = 3001;

/**
 * Initialize MongoDB connection and start Express + Socket.IO server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Health check
    await healthCheck();
    
    // Get database instance for any additional setup
    const db = getDb();
    
    // Create indexes for messages collection
    await db.collection('messages').createIndex({ channelId: 1 });
    await db.collection('messages').createIndex({ createdAt: -1 });
    console.log('✓ Message indexes created');
    
    // Initialize Socket.IO with HTTPS server
    initializeSocket(httpsServer);
    console.log('✓ Socket.IO initialized');
    
    // Start PeerJS server
    const peerServer = PeerServer({ 
      port: PEER_PORT, 
      path: '/',
      ssl: {
        key: fs.readFileSync(path.join(__dirname, 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
      }
    });
    console.log('✓ PeerJS server started on port', PEER_PORT);
    
    // Start HTTPS server (both Express and Socket.IO)
    httpsServer.listen(PORT, () => {
      console.log(`✓ Video chat server running on https://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(console.error);
