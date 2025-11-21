// backend/models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    },
    conversationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Conversation' 
    },
    messageId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Message' 
    },
    type: { 
      type: String, 
      enum: [
        'new_message', 
        'new_inquiry', 
        'price_offer', 
        'swap_request',
        'product_liked',
        'product_viewed',
        'call_missed'
      ], 
      required: true 
    },
    title: { 
      type: String, 
      required: true 
    },
    message: { 
      type: String, 
      required: true 
    },
    data: {
      productTitle: { type: String },
      productImage: { type: String },
      senderName: { type: String },
      senderImage: { type: String },
      offerAmount: { type: Number },
      messagePreview: { type: String }
    },
    isRead: { 
      type: Boolean, 
      default: false 
    },
    isDelivered: { 
      type: Boolean, 
      default: false 
    },
    priority: { 
      type: String, 
      enum: ['low', 'normal', 'high', 'urgent'], 
      default: 'normal' 
    },
    expiresAt: { 
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  },
  { timestamps: true }
);

// Index for efficient querying
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for formatted time
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
});

// Static method to create notification
notificationSchema.statics.createNotification = async function({
  recipientId,
  senderId,
  productId,
  conversationId,
  messageId,
  type,
  title,
  message,
  data = {},
  priority = 'normal'
}) {
  try {
    const notification = await this.create({
      recipientId,
      senderId,
      productId,
      conversationId,
      messageId,
      type,
      title,
      message,
      data,
      priority
    });

    await notification.populate([
      { path: 'senderId', select: 'username profilePictureUrl' },
      { path: 'productId', select: 'title imagesUrls price' }
    ]);

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to get user notifications with pagination
notificationSchema.statics.getUserNotifications = async function(userId, page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;
    
    const notifications = await this.find({ recipientId: userId })
      .populate('senderId', 'username profilePictureUrl')
      .populate('productId', 'title imagesUrls price')
      .populate('conversationId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.countDocuments({ recipientId: userId });
    const unreadCount = await this.countDocuments({ recipientId: userId, isRead: false });

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      },
      unreadCount
    };
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    throw error;
  }
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = async function(notificationIds, userId) {
  try {
    const result = await this.updateMany(
      { 
        _id: { $in: notificationIds }, 
        recipientId: userId,
        isRead: false 
      },
      { 
        isRead: true,
        readAt: new Date()
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  try {
    return await this.countDocuments({ 
      recipientId: userId, 
      isRead: false 
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Pre-save middleware to set default data
notificationSchema.pre('save', function(next) {
  if (this.isNew && this.type === 'new_message' && !this.data.messagePreview) {
    this.data.messagePreview = this.message.substring(0, 50) + (this.message.length > 50 ? '...' : '');
  }
  next();
});

export default mongoose.model('Notification', notificationSchema);