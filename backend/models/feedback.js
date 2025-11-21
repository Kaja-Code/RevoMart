import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    type: { type: String, enum: ['bug', 'suggestion', 'general'], required: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    message: { type: String, required: true },
    createdDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Feedback', feedbackSchema);


