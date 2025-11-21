// routes/favorites.js
import express from "express";
import Favorite from "../models/Favorite.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Get user favorites
router.get("/", authMiddleware, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.userId }).populate("productId");
    res.json({ favorites });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

// Add favorite
router.post("/", authMiddleware, async (req, res) => {
  const { productId } = req.body;
  try {
    const existing = await Favorite.findOne({ userId: req.userId, productId });
    if (existing) return res.status(400).json({ error: "Already in favorites" });

    const favorite = await Favorite.create({ userId: req.userId, productId });
    res.json({ favorite });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

// Delete favorite
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await Favorite.findByIdAndDelete(req.params.id);
    res.json({ message: "Removed from favorites" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

export default router;
