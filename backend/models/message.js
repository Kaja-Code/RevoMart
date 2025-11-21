// backend/models/message.js - UPDATED VERSION with reply support
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Product being discussed
    content: { type: String }, // Text message content
    messageType: { 
      type: String, 
      enum: ['text', 'image', 'product', 'call', 'system'], 
      default: 'text' 
    },
    imageUrl: { type: String }, // For image messages
    callDuration: { type: Number }, // For call messages (in seconds)
    callType: { 
      type: String, 
      enum: ['voice', 'video'],
      default: 'voice'
    },
    sentDate: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
    isDelivered: { type: Boolean, default: false },
    // For product sharing in chat
    sharedProduct: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      productTitle: { type: String },
      productPrice: { type: Number },
      productImage: { type: String }
    },
    // NEW: Reply functionality
    replyTo: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: { type: String },
      messageType: { type: String },
      imageUrl: { type: String }
    },
    // Message status for better UX
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent'
    },
    // Edited status
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    // Deleted status (soft delete)
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
  },
  { timestamps: true }
);

// Index for efficient querying
messageSchema.index({ senderId: 1, receiverId: 1, sentDate: -1 });
messageSchema.index({ productId: 1 });
messageSchema.index({ 'replyTo.messageId': 1 });
messageSchema.index({ isDeleted: 1, sentDate: -1 });

// Virtual for message age
messageSchema.virtual('messageAge').get(function() {
  const now = new Date();
  const diff = now - this.sentDate;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return this.sentDate.toLocaleDateString();
});

// Method to soft delete message
messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Method to mark as read
messageSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.status = 'read';
  return this.save();
};

// Method to mark as delivered
messageSchema.methods.markAsDelivered = function() {
  this.isDelivered = true;
  if (this.status === 'sent') {
    this.status = 'delivered';
  }
  return this.save();
};

// Static method to get conversation messages
messageSchema.statics.getConversationMessages = async function(senderId, receiverId, options = {}) {
  const {
    page = 1,
    limit = 50,
    includeDeleted = false
  } = options;

  const filter = {
    $or: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId }
    ],
    ...(includeDeleted ? {} : { isDeleted: false })
  };

  const messages = await this.find(filter)
    .populate('senderId', 'username profilePictureUrl')
    .populate('receiverId', 'username profilePictureUrl')
    .populate('sharedProduct.productId', 'title price imagesUrls')
    .populate('replyTo.senderId', 'username')
    .sort({ sentDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  return messages.reverse();
};

// Static method to get messages with replies
messageSchema.statics.getMessagesWithReplies = async function(conversationId, options = {}) {
  const {
    page = 1,
    limit = 50
  } = options;

  // First get the conversation to find participants
  const Conversation = mongoose.model('Conversation');
  const conversation = await Conversation.findById(conversationId);
  
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const [participant1, participant2] = conversation.participants;

  const messages = await this.find({
    $or: [
      { senderId: participant1, receiverId: participant2 },
      { senderId: participant2, receiverId: participant1 }
    ],
    isDeleted: false
  })
  .populate('senderId', 'username profilePictureUrl')
  .populate('receiverId', 'username profilePictureUrl')
  .populate('sharedProduct.productId', 'title price imagesUrls')
  .populate('replyTo.senderId', 'username')
  .populate({
    path: 'replyTo.messageId',
    select: 'content messageType imageUrl senderId',
    populate: {
      path: 'senderId',
      select: 'username'
    }
  })
  .sort({ sentDate: -1 })
  .limit(limit * 1)
  .skip((page - 1) * limit);

  return messages.reverse();
};

// Pre-save middleware to update message status
messageSchema.pre('save', function(next) {
  if (this.isModified('isRead') && this.isRead) {
    this.status = 'read';
  } else if (this.isModified('isDelivered') && this.isDelivered && this.status === 'sent') {
    this.status = 'delivered';
  }
  next();
});

// Pre-find middleware to exclude deleted messages by default
messageSchema.pre(/^find/, function(next) {
  // Only exclude deleted if not explicitly including them
  if (!this.getQuery().includeDeleted) {
    this.find({ isDeleted: { $ne: true } });
  }
  next();
});

export default mongoose.model('Message', messageSchema);