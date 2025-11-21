import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // Updated to reference Product
    addedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Favorite', favoriteSchema);