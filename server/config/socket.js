import { Server } from 'socket.io';
import { getCollection } from './db.js';

let io;

/**
 * Initialize Socket.IO server with HTTP server instance
 * @param {http.Server} httpServer - HTTP server instance from Express
 */
export function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:4200', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Handle client connections
  io.on('connection', (socket) => {
    console.log(`✓ Socket connected: ${socket.id}`);

    // Handle user joining a channel
    socket.on('join', async (payload) => {
      try {
        const { channelId, userId, username } = payload;
        console.log(`User ${username} (${userId}) joining channel ${channelId}`);

        const usersCollection = getCollection('users');
        const channelsCollection = getCollection('channels');
        const groupsCollection = getCollection('groups');

        // Verify user exists
        const user = await usersCollection.findOne({ id: userId });
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Verify channel exists and user has access
        const channel = await channelsCollection.findOne({ id: channelId });
        if (!channel) {
          socket.emit('error', { message: 'Channel not found' });
          return;
        }

        // Check if user is a member of the group (all group members can access all channels)
        const group = await groupsCollection.findOne({ id: channel.groupId });
        if (!group) {
          socket.emit('error', { message: 'Group not found' });
          return;
        }
        
        const isSuperAdmin = user.roles.includes('super') || user.roles.includes('super_admin');
        const isGroupMember = group.memberIds && group.memberIds.includes(userId);

        if (!isSuperAdmin && !isGroupMember) {
          socket.emit('error', { message: 'You must be a member of the group to access this channel' });
          return;
        }

        // Join the Socket.IO room for this channel
        socket.join(channelId);
        console.log(`✓ User ${username} joined room: ${channelId}`);

        // Fetch and send chat history (last 50 messages)
        const messagesCollection = getCollection('messages');
        const history = await messagesCollection
          .find({ channelId })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray();

        // Reverse to show oldest first
        const sortedHistory = history.reverse().map(({ _id, ...msg }) => ({
          ...msg,
          createdAt: msg.createdAt.toISOString()
        }));

        socket.emit('history', sortedHistory);

        // Notify others in the room
        socket.to(channelId).emit('user-joined', {
          userId,
          username,
          message: `${username} joined the channel`
        });

      } catch (error) {
        console.error('Join error:', error);
        socket.emit('error', { message: 'Failed to join channel' });
      }
    });

    // Handle new message
    socket.on('message', async (payload) => {
      try {
        const { channelId, userId, username, text, imagePath } = payload;
        console.log(`Message from ${username} in ${channelId}: ${text || '[image]'}`);

        const messagesCollection = getCollection('messages');

        // Create message document
        const newMessage = {
          channelId,
          userId,
          username,
          text: text || '',
          imagePath: imagePath || null,
          createdAt: new Date()
        };

        // Save to MongoDB
        const result = await messagesCollection.insertOne(newMessage);

        // Prepare message for broadcast (remove MongoDB _id)
        const messageWithId = {
          messageId: result.insertedId.toString(),
          channelId,
          userId,
          username,
          text: text || '',
          imagePath: imagePath || null,
          createdAt: newMessage.createdAt.toISOString()
        };

        // Broadcast to all users in the channel room (including sender)
        io.to(channelId).emit('message', messageWithId);

      } catch (error) {
        console.error('Message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle user leaving a channel
    socket.on('leave', (payload) => {
      const { channelId, username } = payload;
      socket.leave(channelId);
      console.log(`User ${username} left channel ${channelId}`);

      // Notify others
      socket.to(channelId).emit('user-left', {
        username,
        message: `${username} left the channel`
      });
    });

    // Handle typing indicator
    socket.on('typing', (payload) => {
      const { channelId, username } = payload;
      socket.to(channelId).emit('user-typing', { username });
    });

    // Handle joining a group room (for group-level notifications)
    socket.on('join-group', (payload) => {
      const { groupId, userId, username } = payload;
      socket.join(`group_${groupId}`);
      console.log(`✓ User ${username} joined group room: group_${groupId}`);
    });

    // Handle leaving a group room
    socket.on('leave-group', (payload) => {
      const { groupId, username } = payload;
      socket.leave(`group_${groupId}`);
      console.log(`User ${username} left group room: group_${groupId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`✗ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get Socket.IO instance
 * @returns {Server} Socket.IO server instance
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

/**
 * Emit a notification to all admins of a group
 * @param {string} groupId - Group ID
 * @param {object} notification - Notification data
 */
export function notifyGroupAdmins(groupId, notification) {
  if (io) {
    io.to(`group_${groupId}`).emit('group-notification', notification);
    console.log(`📢 Notification sent to group_${groupId}:`, notification.type);
  }
}
