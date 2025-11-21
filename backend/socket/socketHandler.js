// backend/socket/socketHandler.js - FIXED VERSION
import { Server } from 'socket.io';
import admin from '../config/firebase.js';
import Message from '../models/message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const connectedUsers = new Map(); // userId -> Set of socketIds (support multiple devices)
const socketToUser = new Map(); // socketId -> userId

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5000',
        'http://localhost:8081',
        'http://172.16.20.44:5000',
        'http://192.168.8.100:5000',
        'http://192.168.8.101:5000',
        'http://192.168.8.102:5000',
        'http://192.168.1.230:5000',
        'http://172.20.10.14:5000',
        'https://172.16.20.210:5000'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    upgradeTimeout: 30000,
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true
  });

  // ✅ FIXED: Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        console.error('Socket auth failed: No token provided');
        return next(new Error('Authentication error: Missing token'));
      }

      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userDoc = await User.findOne({ firebaseUid: decodedToken.uid });
      
      if (!userDoc) {
        console.error('Socket auth failed: User not found');
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = userDoc._id.toString();
      socket.userDetails = {
        _id: userDoc._id,
        username: userDoc.username,
        email: userDoc.email,
        profilePictureUrl: userDoc.profilePictureUrl
      };
      
      console.log(`✅ Socket authenticated: ${socket.userId}`);
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User connected: ${userId} (Socket: ${socket.id})`);

    // ✅ Add user to connected users (support multiple devices)
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId).add(socket.id);
    socketToUser.set(socket.id, userId);

    // Broadcast user online status
    socket.broadcast.emit('userOnline', { userId, isOnline: true });

    // ✅ Auto-join user to their personal room
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} joined personal room`);

    // Send pending notifications
    sendPendingNotifications(socket, userId);

    // ✅ FIXED: Handle joining conversation room
    socket.on('joinConversation', async (conversationId) => {
      try {
        if (!conversationId) {
          socket.emit('error', { message: 'conversationId is required' });
          return;
        }

        // Verify user is participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId
        });

        if (!conversation) {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        console.log(`💬 User ${userId} joined conversation ${conversationId}`);
        
        socket.emit('conversationJoined', { conversationId });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // ✅ FIXED: Handle leaving conversation room
    socket.on('leaveConversation', (conversationId) => {
      try {
        if (!conversationId) return;
        
        socket.leave(`conversation:${conversationId}`);
        console.log(`🚪 User ${userId} left conversation ${conversationId}`);
      } catch (error) {
        console.error('Error leaving conversation:', error);
      }
    });

    // ✅ FIXED: Handle new message (broadcast to all participants)
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, message } = data;
        
        if (!conversationId || !message) {
          socket.emit('messageError', { error: 'Missing required data' });
          return;
        }

        console.log(`📨 Broadcasting message ${message._id} to conversation ${conversationId}`);
        
        // Broadcast to conversation room (excluding sender)
        socket.to(`conversation:${conversationId}`).emit('newMessage', message);
        
        // Get conversation participants
        const conversation = await Conversation.findById(conversationId)
          .populate('participants', '_id username');
        
        if (conversation) {
          const receiverId = conversation.participants.find(
            p => p._id.toString() !== userId
          )?._id.toString();

          if (receiverId) {
            // ✅ Also emit to receiver's personal room (for notification)
            io.to(`user:${receiverId}`).emit('newMessage', message);
            
            // Update message status to delivered if receiver is online
            if (connectedUsers.has(receiverId)) {
              try {
                await Message.findByIdAndUpdate(message._id, {
                  isDelivered: true,
                  status: 'delivered'
                });
                
                // Notify sender about delivery
                socket.emit('messageDelivered', { 
                  messageId: message._id,
                  conversationId 
                });
              } catch (dbError) {
                console.error('Error updating delivery status:', dbError);
              }
            }

            // Emit notification event
            io.to(`user:${receiverId}`).emit('newNotification', {
              type: 'new_message',
              conversationId,
              senderId: userId,
              message: message.content || 'New message',
              timestamp: new Date()
            });
          }
        }
      } catch (error) {
        console.error('Error handling sendMessage:', error);
        socket.emit('messageError', { error: 'Failed to send message' });
      }
    });

    // ✅ Handle typing indicator
    socket.on('typing', (data) => {
      try {
        const { conversationId, isTyping } = data;
        
        if (!conversationId) return;
        
        // Broadcast to conversation room (excluding sender)
        socket.to(`conversation:${conversationId}`).emit('userTyping', { 
          userId, 
          isTyping 
        });
      } catch (error) {
        console.error('Error handling typing:', error);
      }
    });

    // ✅ FIXED: Handle message read status
    socket.on('messageRead', async (data) => {
      try {
        const { conversationId, messageIds } = data;
        
        if (!conversationId || !messageIds || !Array.isArray(messageIds)) {
          socket.emit('error', { message: 'Invalid data for read status' });
          return;
        }

        // Update messages
        await Message.updateMany(
          { 
            _id: { $in: messageIds }, 
            receiverId: userId,
            isRead: false
          },
          { 
            isRead: true,
            status: 'read'
          }
        );

        // Broadcast read status to conversation
        socket.to(`conversation:${conversationId}`).emit('messagesRead', { 
          messageIds, 
          readBy: userId,
          conversationId
        });

        console.log(`✓✓ ${messageIds.length} messages marked as read in ${conversationId}`);
      } catch (error) {
        console.error('Error updating read status:', error);
        socket.emit('error', { message: 'Failed to update read status' });
      }
    });

    // ✅ Handle message deletion
    socket.on('deleteMessage', async (data) => {
      try {
        const { messageId, conversationId } = data;
        
        if (!messageId || !conversationId) return;

        // Verify ownership
        const message = await Message.findById(messageId);
        if (!message || message.senderId.toString() !== userId) {
          socket.emit('error', { message: 'Not authorized to delete this message' });
          return;
        }

        // Delete message
        await Message.findByIdAndDelete(messageId);
        
        // Broadcast deletion
        io.to(`conversation:${conversationId}`).emit('messageDeleted', { 
          messageId,
          conversationId 
        });

        console.log(`🗑️ Message ${messageId} deleted`);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    });

    // ✅ Handle notification events
    socket.on('markNotificationRead', async (data) => {
      try {
        const { notificationId } = data;
        
        if (notificationId) {
          await Notification.findOneAndUpdate(
            { _id: notificationId, recipientId: userId },
            { isRead: true, readAt: new Date() }
          );
          
          const unreadCount = await Notification.getUnreadCount(userId);
          socket.emit('unreadCountUpdate', { count: unreadCount });
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    });

    // ✅ Get unread count
    socket.on('getUnreadCount', async () => {
      try {
        const unreadCount = await Notification.getUnreadCount(userId);
        socket.emit('unreadCountUpdate', { count: unreadCount });
      } catch (error) {
        console.error('Error getting unread count:', error);
      }
    });

    // ✅ Handle voice/video call requests
    socket.on('callUser', async (data) => {
      try {
        const { conversationId, callType, receiverId } = data;
        
        if (!conversationId || !callType || !receiverId) {
          socket.emit('callError', { error: 'Missing call data' });
          return;
        }

        // Check if receiver is online
        if (connectedUsers.has(receiverId)) {
          io.to(`user:${receiverId}`).emit('incomingCall', {
            callerId: userId,
            callerName: socket.userDetails.username,
            callType,
            conversationId
          });
          
          console.log(`📞 Call initiated: ${userId} -> ${receiverId}`);
        } else {
          socket.emit('callError', { error: 'User is offline' });
        }
      } catch (error) {
        console.error('Error handling call:', error);
        socket.emit('callError', { error: 'Failed to initiate call' });
      }
    });

    // ✅ Handle call response
    socket.on('callResponse', (data) => {
      try {
        const { conversationId, callerId, accepted } = data;
        
        if (!conversationId || !callerId) return;
        
        io.to(`user:${callerId}`).emit('callResponse', { 
          accepted, 
          conversationId,
          responderId: userId
        });

        console.log(`📞 Call ${accepted ? 'accepted' : 'rejected'}: ${callerId} <- ${userId}`);
      } catch (error) {
        console.error('Error handling call response:', error);
      }
    });

    // ✅ Handle call end
    socket.on('endCall', (data) => {
      try {
        const { conversationId, otherUserId } = data;
        
        if (!conversationId || !otherUserId) return;
        
        io.to(`user:${otherUserId}`).emit('callEnded', { 
          conversationId,
          endedBy: userId
        });

        console.log(`📞 Call ended: ${userId} - ${otherUserId}`);
      } catch (error) {
        console.error('Error handling call end:', error);
      }
    });

    // ✅ Handle conversation updates
    socket.on('conversationUpdated', (data) => {
      try {
        const { conversationId, update } = data;
        if (!conversationId) return;

        socket.to(`conversation:${conversationId}`).emit('conversationUpdated', {
          conversationId,
          update
        });
      } catch (error) {
        console.error('Error handling conversation update:', error);
      }
    });

    // ✅ Handle disconnect
    socket.on('disconnect', (reason) => {
      try {
        console.log(`🔌❌ User ${userId} disconnected (${reason})`);

        // Remove socket from user's set
        const userSockets = connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          
          // If no more sockets for this user, mark as offline
          if (userSockets.size === 0) {
            connectedUsers.delete(userId);
            socket.broadcast.emit('userOnline', { userId, isOnline: false });
            console.log(`👤 User ${userId} is now offline`);
          }
        }
        
        socketToUser.delete(socket.id);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Handle socket errors
    socket.on('error', (error) => {
      console.error('Socket error:', {
        socketId: socket.id,
        userId,
        error: error.message
      });
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  // IO-level error handling
  io.on('error', (error) => {
    console.error('Socket.IO server error:', error);
  });

  console.log('✅ Socket.IO server initialized');
  return io;
};

// ✅ Helper function to send pending notifications
const sendPendingNotifications = async (socket, userId) => {
  try {
    const notifications = await Notification.find({
      recipientId: userId,
      isRead: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
    .populate('senderId', 'username profilePictureUrl')
    .populate('productId', 'title imagesUrls')
    .sort({ createdAt: -1 })
    .limit(10);

    if (notifications.length > 0) {
      socket.emit('pendingNotifications', {
        notifications,
        count: notifications.length
      });
    }

    const unreadCount = await Notification.getUnreadCount(userId);
    socket.emit('unreadCountUpdate', { count: unreadCount });
  } catch (error) {
    console.error('Error sending pending notifications:', error);
  }
};

// ✅ Helper function to get online users
export const getOnlineUsers = () => {
  return Array.from(connectedUsers.keys());
};

// ✅ Helper function to check if user is online
export const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

// ✅ Helper function to emit to specific user (all their devices)
export const emitToUser = (io, userId, event, data) => {
  try {
    const emitted = io.to(`user:${userId}`).emit(event, data);
    console.log(`📤 Emitted ${event} to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error emitting to user:', error);
    return false;
  }
};

// ✅ Helper function to broadcast notification to user
export const emitNotificationToUser = async (io, userId, notification) => {
  try {
    io.to(`user:${userId}`).emit('newNotification', {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      timestamp: notification.createdAt,
      isRead: false
    });
    
    const unreadCount = await Notification.getUnreadCount(userId);
    io.to(`user:${userId}`).emit('unreadCountUpdate', { count: unreadCount });
    
    console.log(`🔔 Notification sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error emitting notification to user:', error);
    return false;
  }
};

// ✅ Helper function to get connection stats
export const getConnectionStats = () => {
  return {
    totalUsers: connectedUsers.size,
    totalSockets: socketToUser.size,
    onlineUsers: Array.from(connectedUsers.keys()),
    socketsPerUser: Array.from(connectedUsers.entries()).map(([userId, sockets]) => ({
      userId,
      socketCount: sockets.size
    }))
  };
};