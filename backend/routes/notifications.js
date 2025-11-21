// backend/routes/notifications.js
import { Router } from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendPushNotification, sendBulkPushNotifications } from '../services/fcmService.js';

const router = Router();

// Get user notifications with pagination
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, unreadOnly = false } = req.query;
    
    let filter = { recipientId: req.userId };
    
    if (type) {
      filter.type = type;
    }
    
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const result = await Notification.getUserNotifications(
      req.userId, 
      parseInt(page), 
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notifications' 
    });
  }
});

// Get unread notification count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.userId);
    
    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch unread count' 
    });
  }
});

// Mark notifications as read
router.put('/mark-read', authMiddleware, async (req, res) => {
  try {
    const { notificationIds, markAll = false } = req.body;

    let result;
    
    if (markAll) {
      result = await Notification.updateMany(
        { recipientId: req.userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
    } else if (notificationIds && notificationIds.length > 0) {
      result = await Notification.markAsRead(notificationIds, req.userId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Provide notificationIds or set markAll to true'
      });
    }

    res.json({
      success: true,
      message: 'Notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark notifications as read' 
    });
  }
});

// Delete notification
router.delete('/:notificationId', authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: req.userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete notification' 
    });
  }
});

// Get notifications by type (for seller dashboard)
router.get('/seller/dashboard', authMiddleware, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get notifications for seller's products
    const sellerProducts = await Product.find({ ownerId: req.userId }).select('_id');
    const productIds = sellerProducts.map(p => p._id);

    const notifications = await Notification.find({
      $or: [
        { recipientId: req.userId },
        { productId: { $in: productIds } }
      ],
      createdAt: { $gte: startDate }
    })
    .populate('senderId', 'username profilePictureUrl')
    .populate('productId', 'title imagesUrls price')
    .sort({ createdAt: -1 })
    .limit(100);

    // Group by type for dashboard stats
    const stats = await Notification.aggregate([
      {
        $match: {
          recipientId: req.userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          }
        }
      }
    ]);

    // Recent activity summary
    const recentActivity = {
      newMessages: notifications.filter(n => n.type === 'new_message').length,
      newInquiries: notifications.filter(n => n.type === 'new_inquiry').length,
      priceOffers: notifications.filter(n => n.type === 'price_offer').length,
      productViews: notifications.filter(n => n.type === 'product_viewed').length,
      totalUnread: notifications.filter(n => !n.isRead).length
    };

    res.json({
      success: true,
      data: {
        notifications,
        stats,
        recentActivity,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Error fetching seller dashboard data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch seller dashboard data' 
    });
  }
});

// Update FCM token
router.post('/fcm-token', authMiddleware, async (req, res) => {
  try {
    const { token, deviceType = 'android', deviceId } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'FCM token is required'
      });
    }

    const user = await User.findById(req.userId);
    const success = await user.addFCMToken(token, deviceType, deviceId);

    if (success) {
      res.json({
        success: true,
        message: 'FCM token updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update FCM token'
      });
    }
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update FCM token' 
    });
  }
});

// Remove FCM token
router.delete('/fcm-token', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'FCM token is required'
      });
    }

    const user = await User.findById(req.userId);
    const success = await user.removeFCMToken(token);

    if (success) {
      res.json({
        success: true,
        message: 'FCM token removed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to remove FCM token'
      });
    }
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove FCM token' 
    });
  }
});

// Update notification settings
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const settings = req.body;

    const user = await User.findById(req.userId);
    const success = await user.updateNotificationSettings(settings);

    if (success) {
      res.json({
        success: true,
        message: 'Notification settings updated successfully',
        settings: user.notificationSettings
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update notification settings'
      });
    }
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update notification settings' 
    });
  }
});

// Get notification settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('notificationSettings');

    res.json({
      success: true,
      settings: user.notificationSettings
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notification settings' 
    });
  }
});

// Test notification (for development)
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const { type = 'new_message', title, message } = req.body;

    const notification = await Notification.createNotification({
      recipientId: req.userId,
      senderId: req.userId,
      type,
      title: title || 'Test Notification',
      message: message || 'This is a test notification',
      data: {
        senderName: 'Test User',
        productTitle: 'Test Product'
      }
    });

    // Send push notification
    const user = await User.findById(req.userId);
    const fcmTokens = user.getActiveFCMTokens();
    
    if (fcmTokens.length > 0) {
      await sendBulkPushNotifications(fcmTokens, {
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification._id.toString(),
          type: notification.type
        }
      });
    }

    res.json({
      success: true,
      message: 'Test notification sent',
      notification
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test notification' 
    });
  }
});

export default router;