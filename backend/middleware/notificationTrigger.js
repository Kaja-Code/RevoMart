// backend/middleware/notificationTrigger.js
import { notificationHelpers } from '../services/fcmService.js';
import Product from '../models/Product.js';
import Conversation from '../models/Conversation.js';

// Middleware to trigger notifications on message events
export const triggerMessageNotification = async (req, res, next) => {
  try {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = async function(data) {
      try {
        // Check if message was successfully created
        if (data.message && res.statusCode === 201) {
          const message = data.message;
          
          // Get conversation and product details
          const conversation = await Conversation.findById(req.body.conversationId)
            .populate('productId', 'title')
            .populate('participants', 'username');
          
          if (conversation) {
            const productTitle = conversation.productId?.title || 'Unknown Product';
            let messageContent = '';
            
            // Format message content based on type
            switch (message.messageType) {
              case 'text':
                messageContent = message.content;
                break;
              case 'image':
                messageContent = '📷 Sent an image';
                break;
              case 'product':
                messageContent = '🛍️ Shared a product';
                break;
              case 'call':
                messageContent = '📞 Called you';
                break;
              default:
                messageContent = 'Sent a message';
            }
            
            // Check if this is the first message (new inquiry)
            const isFirstMessage = !conversation.lastMessage || 
              conversation.lastMessage.senderId?.toString() !== message.senderId?.toString();
            
            if (isFirstMessage && conversation.productId) {
              // Send new inquiry notification
              await notificationHelpers.newInquiry(
                message.senderId._id || message.senderId,
                message.receiverId,
                conversation.productId._id,
                conversation._id
              );
            } else {
              // Send new message notification
              await notificationHelpers.newMessage(
                message.senderId._id || message.senderId,
                message.receiverId,
                conversation._id,
                message._id,
                messageContent,
                productTitle
              );
            }
          }
        }
      } catch (error) {
        console.error('Error triggering message notification:', error);
        // Don't fail the request if notification fails
      }
      
      // Call original json method
      originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Error in notification trigger middleware:', error);
    next();
  }
};

// Middleware to trigger notifications on product view/like events
export const triggerProductNotification = async (req, res, next) => {
  try {
    const originalJson = res.json;
    
    res.json = async function(data) {
      try {
        if (res.statusCode === 200 && req.route?.path?.includes('like')) {
          // Product liked
          const { productId } = req.params || req.body;
          
          if (productId) {
            const product = await Product.findById(productId).populate('ownerId');
            
            if (product && product.ownerId._id.toString() !== req.userId.toString()) {
              await notificationHelpers.productLiked(
                req.userId,
                product.ownerId._id,
                productId
              );
            }
          }
        } else if (res.statusCode === 200 && req.route?.path?.includes('view')) {
          // Product viewed (you can implement view tracking)
          // This would be called when someone views product details
          const { productId } = req.params;
          
          if (productId) {
            // Increment view count
            await Product.findByIdAndUpdate(
              productId,
              { $inc: { viewsCount: 1 } }
            );
            
            // Optionally notify seller about views (maybe aggregate daily)
            // await notificationHelpers.productViewed(req.userId, product.ownerId._id, productId);
          }
        }
      } catch (error) {
        console.error('Error triggering product notification:', error);
      }
      
      originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Error in product notification middleware:', error);
    next();
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
        
        const Notification = (await import('../models/Notification.js')).default;
        const User = (await import('../models/User.js')).default;
        
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

// Middleware to track product views
export const trackProductView = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const viewerId = req.userId; // Can be null for anonymous users
    
    if (productId) {
      // Increment view count
      const product = await Product.findByIdAndUpdate(
        productId,
        { $inc: { viewsCount: 1 } },
        { new: true }
      ).populate('ownerId');
      
      // Don't track owner's own views
      if (product && viewerId && product.ownerId._id.toString() !== viewerId.toString()) {
        // Store view in a simple way (you could create a ProductView model for detailed tracking)
        // For now, we'll just trigger a notification for high-value products
        
        if (product.price && product.price > 10000) { // High-value products
          // Aggregate views and notify seller once per day
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const Notification = (await import('../models/Notification.js')).default;
          
          // Check if we already sent a view notification today
          const existingNotification = await Notification.findOne({
            recipientId: product.ownerId._id,
            type: 'product_viewed',
            productId: productId,
            createdAt: { $gte: today }
          });
          
          if (!existingNotification && Math.random() > 0.7) { // 30% chance to avoid spam
            const User = (await import('../models/User.js')).default;
            const viewer = viewerId ? await User.findById(viewerId).select('username') : null;
            
            const viewerName = viewer ? viewer.username : 'Someone';
            
            // Don't await this to avoid slowing down the request
            notificationHelpers.productLiked(
              viewerId,
              product.ownerId._id,
              productId
            ).catch(error => {
              console.error('Error sending product view notification:', error);
            });
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error tracking product view:', error);
    next(); // Continue even if tracking fails
  }
};

// Rate limiting for notifications (prevent spam)
const notificationRateLimit = new Map();

export const checkNotificationRateLimit = (senderId, recipientId, type) => {
  const key = `${senderId}-${recipientId}-${type}`;
  const now = Date.now();
  const lastSent = notificationRateLimit.get(key);
  
  // Different cooldowns for different notification types
  const cooldowns = {
    'new_message': 30 * 1000, // 30 seconds
    'new_inquiry': 60 * 1000, // 1 minute
    'price_offer': 300 * 1000, // 5 minutes
    'product_liked': 3600 * 1000, // 1 hour
    'product_viewed': 3600 * 1000 // 1 hour
  };
  
  const cooldown = cooldowns[type] || 60 * 1000; // Default 1 minute
  
  if (lastSent && (now - lastSent) < cooldown) {
    return false; // Rate limited
  }
  
  notificationRateLimit.set(key, now);
  
  // Clean up old entries every hour
  if (Math.random() > 0.99) {
    const oneHourAgo = now - 3600 * 1000;
    for (const [k, timestamp] of notificationRateLimit.entries()) {
      if (timestamp < oneHourAgo) {
        notificationRateLimit.delete(k);
      }
    }
  }
  
  return true; // Not rate limited
};