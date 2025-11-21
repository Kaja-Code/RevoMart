import { Router } from 'express';
import Feedback from '../models/feedback.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Create feedback (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { email, type, rating = 0, message } = req.body;

    if (!email || !type || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const feedback = await Feedback.create({
      userId: req.userId,
      email,
      type,
      rating,
      message,
    });

    return res.status(201).json({ feedback });
  } catch (err) {
    console.error('Create feedback error:', err.message);
    return res.status(500).json({ error: 'Failed to create feedback' });
  }
});

// List feedback (admin use; basic pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Feedback.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Feedback.countDocuments(),
    ]);

    return res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('List feedback error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

export default router;


