import { Router } from 'express';
import User from '../models/User.js';
import Review from '../models/Review.js';

const router = Router();

// GET all reviews of a seller
router.get('/seller/:sellerId', async (req, res) => {
  const { sellerId } = req.params;

  try {
    // Find seller by Firebase UID
    const seller = await User.findOne({ firebaseUid: sellerId });
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    // Fetch reviews
    const reviews = await Review.find({ seller: seller._id }).sort({ createdAt: -1 });
    res.json({ reviews, ratingAverage: seller.ratingAverage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST a review for a seller
router.post('/seller/:sellerId', async (req, res) => {
  const { sellerId } = req.params;
  const { reviewerId, rating, comment } = req.body;

  if (!sellerId || !reviewerId) {
    return res.status(400).json({ message: 'Seller ID and reviewer ID are required' });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  try {
    const seller = await User.findOne({ firebaseUid: sellerId });
    const reviewer = await User.findOne({ firebaseUid: reviewerId });

    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    if (!reviewer) return res.status(404).json({ message: 'Reviewer not found' });

    const review = new Review({
      seller: seller._id,
      reviewer: reviewer._id,
      reviewerName: reviewer.username,
      rating,
      comment,
    });

    await review.save();

    // Update seller average rating
    const allReviews = await Review.find({ seller: seller._id });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    seller.ratingAverage = Number((totalRating / allReviews.length).toFixed(1));
    await seller.save();

    res.status(201).json({ review, ratingAverage: seller.ratingAverage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
