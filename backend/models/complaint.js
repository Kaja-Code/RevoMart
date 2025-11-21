import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    complainantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Updated to reference Product
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_review', 'resolved', 'closed'], default: 'open' },
    createdDate: { type: Date, default: Date.now },
    resolvedDate: { type: Date },
    resolutionNotes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Complaint', complaintSchema);