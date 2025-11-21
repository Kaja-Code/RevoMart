import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // Updated to reference Product
    swapProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Updated to reference Product
    type: { type: String, enum: ['sale', 'swap'], required: true },
    amount: { type: Number },
    status: { type: String, enum: ['pending', 'completed', 'cancelled', 'disputed'], default: 'pending' },
    createdDate: { type: Date, default: Date.now },
    completedDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);