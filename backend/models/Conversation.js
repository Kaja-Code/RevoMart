// backend/models/Conversation.js - SIMPLE CHAT VERSION
import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    }],
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product',
      // Optional: stores the most recent product discussed
    },
    lastMessage: {
      content: { type: String },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      messageType: { type: String, default: 'text' },
      sentDate: { type: Date, default: Date.now }
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// 🔥 SIMPLE: One conversation per user pair (unique participants only)
conversationSchema.index(
  { participants: 1 }, 
  { 
    unique: true,
    name: 'unique_participants_conversation'
  }
);

// Additional indexes for performance
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ productId: 1 });

export default mongoose.model('Conversation', conversationSchema);