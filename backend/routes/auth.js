// backend/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Register user (first step - creates user in MongoDB)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;


    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user (without Firebase UID initially)
    const user = await User.create({
      username,
      email,
      passwordHash,
      infoCompleted: false
    });

    res.status(201).json({ 
      message: 'User registered successfully',
      userId: user._id,
      email: user.email,
      username: user.username
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});


// Update user profile (second step - adds Firebase UID and additional info)
router.put('/:userId/updateProfile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { phoneNumber, bio, address, firebaseUid } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        phoneNumber,
        bio,
        address,
        firebaseUid,
        infoCompleted: true,
        lastLoginDate: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        address: user.address,
        profilePictureUrl: user.profilePictureUrl,
        infoCompleted: user.infoCompleted,
        role: user.role

      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user by Firebase UID
router.get('/user/:firebaseUid', authMiddleware, async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    console.log('Fetching user with Firebase UID:', firebaseUid);
    
    const user = await User.findOne({ firebaseUid })
      .select('-passwordHash')
      .populate('favoriteProducts');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        address: user.address,
        profilePictureUrl: user.profilePictureUrl,
        ratingAverage: user.ratingAverage,
        favoriteProducts: user.favoriteProducts,
        infoCompleted: user.infoCompleted,
        registrationDate: user.registrationDate,
        lastLoginDate: user.lastLoginDate
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile (for logged-in users)
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, phoneNumber, bio, address, profilePictureUrl } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        username,
        phoneNumber,
        bio,
        address,
        profilePictureUrl
      },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-passwordHash')
      .populate('favoriteProducts');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

//correct update user field no one plase change it
// Update user details
router.put("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const updateData = req.body;

    console.log("Update request for UID:", uid, "with data:", updateData);

    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      updateData,
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/sellers/:firebaseUid",async (req, res) => {
  
    const { firebaseUid } = req.params;
    console.log("I am in Auth.js :: " , firebaseUid )
    try {
    const seller = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!seller) return res.status(404).json({ message: "Seller not found" });
    res.json(seller);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
   });

export default router;