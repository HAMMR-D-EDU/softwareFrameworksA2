import { Server } from 'socket.io';
import { ObjectId } from 'mongodb';
import { getCollection } from './db.js';

let io;

export function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['https://localhost:4200', 'https://localhost:3000', 'http://localhost:4200'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-user', ({ userId }) => {
      if (!userId) return;
      socket.join(`user_${userId}`);
      console.log(`✓ Socket ${socket.id} joined user room user_${userId}`);
    });
    console.log(`✓ Socket connected: ${socket.id}`);
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
        const sortedHistory = history.reverse().map((doc) => ({
          messageId: doc._id.toString(),
          channelId: doc.channelId,
          userId: doc.userId,
          username: doc.username,
          text: doc.text || '',
          imagePath: doc.imagePath || null,
          replyTo: doc.replyTo || null,
          reactions: doc.reactions || {},
          createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString()
        }));

        socket.emit('history', sortedHistory);

        // Emit current video status for this channel
        try {
          const videoRoom = io.sockets.adapter.rooms.get(`video_${channelId}`);
          const inProgress = !!(videoRoom && videoRoom.size > 0);
          socket.emit('video-status', { roomId: channelId, inProgress });
        } catch {}

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

    socket.on('message', async (payload) => {
      try {
        const { channelId, userId, username, text, imagePath, replyTo = null } = payload;
        console.log(`Message from ${username} in ${channelId}: ${text || '[image]'}`);

        const messagesCollection = getCollection('messages');

        // Prevent replying to own message
        if (replyTo) {
          try {
            const parent = await messagesCollection.findOne({ _id: new ObjectId(replyTo) });
            if (parent && parent.userId === userId) {
              socket.emit('error', { message: 'Cannot reply to your own message' });
              return;
            }
          } catch {}
        }

        // Create message document
        const newMessage = {
          channelId,
          userId,
          username,
          text: text || '',
          imagePath: imagePath || null,
          replyTo: replyTo || null,
          reactions: {}, // emoji -> [userIds]
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
          replyTo: newMessage.replyTo,
          reactions: newMessage.reactions,
          createdAt: newMessage.createdAt.toISOString()
        };

        // Broadcast to all users in the channel room (including sender)
        io.to(channelId).emit('message', messageWithId);

      } catch (error) {
        console.error('Message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('message:reaction', async (payload) => {
      try {
        const { messageId, emoji, userId, channelId } = payload || {};
        if (!messageId || !emoji || !userId || !channelId) {
          socket.emit('error', { message: 'Invalid reaction payload' });
          return;
        }

        const messagesCollection = getCollection('messages');
        let messageDoc = null;
        try {
          messageDoc = await messagesCollection.findOne({ _id: new ObjectId(messageId) });
        } catch {}

        if (!messageDoc) {
          socket.emit('error', { message: 'Message not found for reaction' });
          return;
        }

        // Disallow reacting to own message
        if (messageDoc.userId === userId) {
          socket.emit('error', { message: 'Cannot react to your own message' });
          return;
        }

        const reactions = messageDoc.reactions || {};
        const list = new Set(reactions[emoji] || []);
        if (list.has(userId)) {
          list.delete(userId);
        } else {
          list.add(userId);
        }
        reactions[emoji] = Array.from(list);

        await messagesCollection.updateOne({ _id: messageDoc._id }, { $set: { reactions } });
        io.to(channelId).emit('message:reactions', { messageId, reactions });
      } catch (error) {
        console.error('Reaction error:', error);
        socket.emit('error', { message: 'Failed to toggle reaction' });
      }
    });

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

    socket.on('typing', (payload) => {
      const { channelId, username } = payload;
      socket.to(channelId).emit('user-typing', { username });
    });

    socket.on('join-group', (payload) => {
      const { groupId, userId, username } = payload;
      socket.join(`group_${groupId}`);
      console.log(`User ${username} joined group room: group_${groupId}`);
    });

    socket.on('leave-group', (payload) => {
      const { groupId, username } = payload;
      socket.leave(`group_${groupId}`);
      console.log(`User ${username} left group room: group_${groupId}`);
    });

    socket.on('join-video-room', ({ roomId, peerId, userId, username }) => {
      socket.join(`video_${roomId}`);
      socket.to(`video_${roomId}`).emit('user-connected', { peerId, userId, username });
      console.log(`User ${username} (${peerId}) joined video room: video_${roomId}`);
      // Broadcast to channel that a call is in progress
      io.to(roomId).emit('video-status', { roomId, inProgress: true });
    });

    socket.on('leave-video-room', ({ roomId, peerId, username }) => {
      socket.to(`video_${roomId}`).emit('user-disconnected', { peerId, username });
      socket.leave(`video_${roomId}`);
      console.log(`User ${username} (${peerId}) left video room: video_${roomId}`);
      // If no more peers in video room, mark as not in progress
      try {
        const videoRoom = io.sockets.adapter.rooms.get(`video_${roomId}`);
        const inProgress = !!(videoRoom && videoRoom.size > 0);
        if (!inProgress) {
          io.to(roomId).emit('video-status', { roomId, inProgress: false });
        }
      } catch {}
    });


    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}


export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}


export function notifyGroupAdmins(groupId, notification) {
  if (io) {
    io.to(`group_${groupId}`).emit('group-notification', notification);
    console.log(`Notification sent to group_${groupId}:`, notification.type);
  }
}
