// backend/services/fcmService.js (Complete and Fixed)
import admin from '../config/firebase.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Product from '../models/Product.js';

// Send push notification to a single token
export const sendPushNotification = async (token, payload) => {
  try {
    const message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl || undefined
      },
      data: {
        ...payload.data,
        clickAction: payload.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
        sound: 'default'
      },
      android: {
        notification: {
          channelId: 'revomart_notifications',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
          icon: 'ic_notification',
          color: '#2f95dc'
        },
        priority: 'high'
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body
            },
            badge: payload.badge || 1,
            sound: 'default',
            'mutable-content': 1
          }
        },
        fcm_options: {
          image: payload.imageUrl || undefined
        }
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.imageUrl || '/icon-192x192.png',
          badge: '/badge-72x72.png',
          actions: [
            {
              action: 'view',
              title: 'View',
              icon: '/view-icon.png'
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
              icon: '/dismiss-icon.png'
            }
          ]
        },
        fcm_options: {
          link: payload.link || 'https://revomart.com/notifications'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Push notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // Handle token errors
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      console.log('Invalid or unregistered token, should be removed:', token);
      return { success: false, error: 'invalid_token', token };
    }
    
    return { success: false, error: error.message };
  }
};

// Send push notifications to multiple tokens
export const sendBulkPushNotifications = async (tokens, payload) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.log('No tokens provided for bulk notification');
      return { success: false, error: 'No tokens provided' };
    }

    const message = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl || undefined
      },
      data: {
        ...payload.data,
        clickAction: payload.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
        sound: 'default'
      },
      android: {
        notification: {
          channelId: 'revomart_notifications',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
          icon: 'ic_notification',
          color: '#2f95dc'
        },
        priority: 'high'
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body
            },
            badge: payload.badge || 1,
            sound: 'default',
            'mutable-content': 1
          }
        },
        fcm_options: {
          image: payload.imageUrl || undefined
        }
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.imageUrl || '/icon-192x192.png',
          badge: '/badge-72x72.png'
        },
        fcm_options: {
          link: payload.link || 'https://revomart.com/notifications'
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);
    
    console.log(`Bulk notification sent: ${response.successCount} successful, ${response.failureCount} failed`);
    
    // Handle failed tokens
    const invalidTokens = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        }
      });
    }
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens
    };
  } catch (error) {
    console.error('Error sending bulk push notifications:', error);
    return { success: false, error: error.message };
  }
};

// Send notification to user (creates notification record and sends push)
// Send notification to user (creates notification record and sends push)
export const notifyUser = async ({
  recipientId,
  senderId,
  productId,
  conversationId,
  messageId,
  type,
  title,
  message,
  data = {},
  priority = 'normal',
  imageUrl = null
}) => {
  try {
    // Create notification record
    const notification = await Notification.createNotification({
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

    // Get recipient user
    const recipient = await User.findById(recipientId);

    if (!recipient) {
      console.error('Recipient user not found:', recipientId);
      return { success: false, error: 'Recipient not found' };
    }

    // ✅ Safe-check + defaults
    const settings = recipient.notificationSettings || {
      pushNotifications: true,
      messageNotifications: true,
      offerNotifications: true,
      productUpdates: true
    };

    // Push notifications enabled?
    if (!settings.pushNotifications) {
      console.log('Push notifications disabled for user:', recipientId);
      return { success: true, message: 'Notifications disabled by user' };
    }

    // Check quiet hours
    if (typeof recipient.isInQuietHours === 'function' &&
        recipient.isInQuietHours() &&
        priority !== 'urgent') {
      console.log('User is in quiet hours, skipping notification:', recipientId);
      return { success: true, message: 'User in quiet hours' };
    }

    // Type-based preferences
    const typePreferences = {
      new_message: settings.messageNotifications,
      new_inquiry: settings.messageNotifications,
      price_offer: settings.offerNotifications,
      swap_request: settings.offerNotifications,
      product_liked: settings.productUpdates,
      product_viewed: settings.productUpdates
    };

    if (typePreferences[type] === false) {
      console.log(`${type} notifications disabled for user:`, recipientId);
      return { success: true, message: 'Notification type disabled by user' };
    }

    // Get active FCM tokens
    const fcmTokens = recipient.getActiveFCMTokens
      ? recipient.getActiveFCMTokens()
      : [];

    if (fcmTokens.length === 0) {
      console.log('No active FCM tokens for user:', recipientId);
      return { success: true, message: 'No FCM tokens available' };
    }

    // Unread count for badge
    const unreadCount = await Notification.getUnreadCount(recipientId);

    // Push payload
    const pushPayload = {
      title,
      body: message,
      imageUrl,
      badge: unreadCount,
      data: {
        notificationId: notification._id.toString(),
        type,
        recipientId: recipientId.toString(),
        senderId: senderId ? senderId.toString() : '',
        productId: productId ? productId.toString() : '',
        conversationId: conversationId ? conversationId.toString() : '',
        ...data
      }
    };

    // Send bulk notification
    const result = await sendBulkPushNotifications(fcmTokens, pushPayload);

    // Clean invalid tokens
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      for (const invalidToken of result.invalidTokens) {
        if (typeof recipient.removeFCMToken === 'function') {
          await recipient.removeFCMToken(invalidToken);
        }
      }
    }

    // Mark delivered
    if (result.success && result.successCount > 0) {
      notification.isDelivered = true;
      await notification.save();
    }

    return {
      success: true,
      notification,
      pushResult: result
    };

  } catch (error) {
    console.error('Error in notifyUser:', error);
    return { success: false, error: error.message };
  }
};


// Notification helper functions for different types
export const notificationHelpers = {
  // New message notification
  newMessage: async (senderId, recipientId, conversationId, messageId, messageContent, productTitle) => {
    const sender = await User.findById(senderId).select('username profilePictureUrl');
    
    return await notifyUser({
      recipientId,
      senderId,
      conversationId,
      messageId,
      type: 'new_message',
      title: `New message from ${sender.username}`,
      message: messageContent.length > 50 ? 
        messageContent.substring(0, 50) + '...' : 
        messageContent,
      data: {
        senderName: sender.username,
        senderImage: sender.profilePictureUrl,
        productTitle,
        messagePreview: messageContent.substring(0, 100)
      },
      priority: 'normal',
      imageUrl: sender.profilePictureUrl
    });
  },

  // New inquiry notification
  newInquiry: async (senderId, recipientId, productId, conversationId) => {
    const sender = await User.findById(senderId).select('username profilePictureUrl');
    const product = await Product.findById(productId).select('title imagesUrls');
    
    return await notifyUser({
      recipientId,
      senderId,
      productId,
      conversationId,
      type: 'new_inquiry',
      title: `New inquiry about your product`,
      message: `${sender.username} is interested in "${product.title}"`,
      data: {
        senderName: sender.username,
        senderImage: sender.profilePictureUrl,
        productTitle: product.title,
        productImage: product.imagesUrls[0]
      },
      priority: 'high',
      imageUrl: product.imagesUrls[0]
    });
  },

  // Price offer notification
  priceOffer: async (senderId, recipientId, productId, offerAmount, originalPrice) => {
    const sender = await User.findById(senderId).select('username');
    const product = await Product.findById(productId).select('title imagesUrls');
    
    return await notifyUser({
      recipientId,
      senderId,
      productId,
      type: 'price_offer',
      title: `Price offer received`,
      message: `${sender.username} offered LKR ${offerAmount.toLocaleString()} for "${product.title}"`,
      data: {
        senderName: sender.username,
        productTitle: product.title,
        productImage: product.imagesUrls[0],
        offerAmount,
        originalPrice
      },
      priority: 'high',
      imageUrl: product.imagesUrls[0]
    });
  },

  // Product liked notification
  productLiked: async (senderId, recipientId, productId) => {
    const sender = await User.findById(senderId).select('username');
    const product = await Product.findById(productId).select('title imagesUrls');
    
    return await notifyUser({
      recipientId,
      senderId,
      productId,
      type: 'product_liked',
      title: `Someone liked your product`,
      message: `${sender.username} liked "${product.title}"`,
      data: {
        senderName: sender.username,
        productTitle: product.title,
        productImage: product.imagesUrls[0]
      },
      priority: 'low',
      imageUrl: product.imagesUrls[0]
    });
  }
};

// Background job to send daily/weekly summary notifications
export const sendSummaryNotifications = async () => {
  try {
    console.log('Starting summary notifications job...');
    
    // Get all sellers (users who have products)
    const sellers = await Product.distinct('ownerId');
    
    for (const sellerId of sellers) {
      try {
        // Get seller's product activity for the last 24 hours
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const dailyStats = await Notification.aggregate([
          {
            $match: {
              recipientId: sellerId,
              createdAt: { $gte: yesterday },
              type: { $in: ['new_message', 'new_inquiry', 'product_viewed', 'product_liked'] }
            }
          },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 }
            }
          }
        ]);
        
        if (dailyStats.length === 0) continue; // No activity
        
        const stats = dailyStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {});
        
        const totalActivity = dailyStats.reduce((sum, stat) => sum + stat.count, 0);
        
        if (totalActivity >= 5) { // Only send if significant activity
          const seller = await User.findById(sellerId).select('username notificationSettings');
          
          if (seller?.notificationSettings?.productUpdates) {
            let summaryMessage = `Daily activity summary: `;
            const activities = [];
            
            if (stats.new_message) activities.push(`${stats.new_message} new messages`);
            if (stats.new_inquiry) activities.push(`${stats.new_inquiry} inquiries`);
            if (stats.product_viewed) activities.push(`${stats.product_viewed} views`);
            if (stats.product_liked) activities.push(`${stats.product_liked} likes`);
            
            summaryMessage += activities.join(', ');
            
            // Create and send summary notification
            await notifyUser({
              recipientId: sellerId,
              senderId: null, // System notification
              type: 'daily_summary',
              title: 'Daily Activity Summary',
              message: summaryMessage,
              data: { stats },
              priority: 'low'
            });
          }
        }
      } catch (error) {
        console.error(`Error sending summary notification for seller ${sellerId}:`, error);
      }
    }
    
    console.log('Summary notifications job completed');
  } catch (error) {
    console.error('Error in summary notifications job:', error);
  }
};

// Clean up expired notifications (run as cron job)
export const cleanupExpiredNotifications = async () => {
  try {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`Cleaned up ${result.deletedCount} expired notifications`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error);
    return 0;
  }
};

// Clean up invalid FCM tokens across all users
export const cleanupInvalidTokens = async () => {
  try {
    const users = await User.find({
      'fcmTokens.0': { $exists: true }
    }).select('fcmTokens');
    
    let cleanedCount = 0;
    
    for (const user of users) {
      const validTokens = [];
      
      for (const tokenData of user.fcmTokens) {
        // Test token validity with a dry run
        try {
          await admin.messaging().send({
            token: tokenData.token,
            data: { test: 'true' }
          }, true); // dry run
          
          validTokens.push(tokenData);
        } catch (error) {
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            cleanedCount++;
            console.log('Removing invalid token:', tokenData.token);
          } else {
            validTokens.push(tokenData); // Keep token if error is not about validity
          }
        }
      }
      
      if (validTokens.length !== user.fcmTokens.length) {
        user.fcmTokens = validTokens;
        await user.save();
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} invalid FCM tokens`);
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up invalid tokens:', error);
    return 0;
  }
};