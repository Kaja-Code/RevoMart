import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Complaint from '../models/complaint.js';

const router = Router();

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.sub;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Create a complaint (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, transactionId, title, description } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Missing required fields' });

    const complaint = await Complaint.create({
      complainantId: req.userId,
      productId,
      transactionId,
      title,
      description,
    });
    res.status(201).json({ complaint });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all complaints for a user (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const complaints = await Complaint.find({ complainantId: req.userId })
      .populate('productId', 'title')
      .populate('transactionId', 'productId');
    res.json({ complaints });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get a single complaint (protected)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ _id: req.params.id, complainantId: req.userId })
      .populate('productId', 'title')
      .populate('transactionId', 'productId');
    if (!complaint) return res.status(404).json({ error: 'Complaint not found or unauthorized' });
    res.json({ complaint });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a complaint (protected, complainant only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const complaint = await Complaint.findOneAndUpdate(
      { _id: req.params.id, complainantId: req.userId },
      { title, description, status, resolvedDate: status === 'resolved' ? Date.now() : undefined },
      { new: true, runValidators: true }
    );
    if (!complaint) return res.status(404).json({ error: 'Complaint not found or unauthorized' });
    res.json({ complaint });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a complaint (protected, complainant only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const complaint = await Complaint.findOneAndDelete({ _id: req.params.id, complainantId: req.userId });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found or unauthorized' });
    res.json({ message: 'Complaint deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;