import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    parentCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    description: { type: String },
    iconUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);