import { Router } from 'express';
import bcrypt from 'bcrypt';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Complaint from '../models/complaint.js';
import Feedback from '../models/feedback.js';
import { adminAuthMiddleware, requirePermission } from '../middleware/adminAuth.js';

const router = Router();

// Admin login (reuse existing login, but check if user is admin)
router.post('/login', async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    
    console.log('Admin login attempt with Firebase UID:', firebaseUid);

    if (!firebaseUid) {
      console.log('❌ Missing Firebase UID');
      return res.status(400).json({ error: 'Firebase UID required' });
    }

    // Check if admin exists with this Firebase UID
    const adminUser = await Admin.findOne({ firebaseUid, isActive: true });
    console.log('Found admin:', adminUser ? 'YES' : 'NO');

    if (!adminUser) {
      console.log('❌ Admin not found or inactive');
      return res.status(401).json({ error: 'Admin access denied' });
    }

    // Update last login
    adminUser.lastLoginDate = new Date();
    await adminUser.save();
    
    console.log('✅ Admin login successful');

    res.json({
      message: 'Admin login successful',
      admin: {
        _id: adminUser._id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        permissions: adminUser.permissions.length > 0 ? adminUser.permissions : adminUser.getDefaultPermissions()
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get admin profile
router.get('/profile', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select('-passwordHash');
    res.json({ admin });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Dashboard stats
router.get('/dashboard/stats', adminAuthMiddleware, async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalComplaints, totalFeedback] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Complaint.countDocuments(),
      Feedback.countDocuments()
    ]);

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const recentProducts = await Product.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const pendingComplaints = await Complaint.countDocuments({
      status: { $in: ['open', 'in_review'] }
    });

    res.json({
      stats: {
        totalUsers,
        totalProducts,
        totalComplaints,
        totalFeedback,
        recentUsers,
        recentProducts,
        pendingComplaints
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// User management
router.get('/users', adminAuthMiddleware, requirePermission('users_manage'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    let filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) {
      filter.isVerified = status === 'verified';
    }

    const users = await User.find(filter)
      .select('-passwordHash')
      .populate('favoriteProducts')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Update user status
router.put('/users/:id/status', adminAuthMiddleware, requirePermission('users_manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isVerified },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User status updated', user });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Product management
router.get('/products', adminAuthMiddleware, requirePermission('products_manage'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (category) filter.categoryId = category;

    const products = await Product.find(filter)
      .populate('ownerId', 'username email')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Update product status
router.put('/products/:id/status', adminAuthMiddleware, requirePermission('products_manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('ownerId', 'username email');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product status updated', product });
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({ error: 'Failed to update product status' });
  }
});

// Delete product
router.delete('/products/:id', adminAuthMiddleware, requirePermission('products_manage'), async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Complaint management
router.get('/complaints', adminAuthMiddleware, requirePermission('complaints_manage'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let filter = {};
    if (status) filter.status = status;

    const complaints = await Complaint.find(filter)
      .populate('complainantId', 'username email')
      .populate('productId', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments(filter);

    res.json({
      complaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ error: 'Failed to get complaints' });
  }
});

// Update complaint status
router.put('/complaints/:id', adminAuthMiddleware, requirePermission('complaints_manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;

    const updateData = { status };
    if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
    if (status === 'resolved') updateData.resolvedDate = new Date();

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('complainantId', 'username email');

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json({ message: 'Complaint updated', complaint });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
});

// Feedback management
router.get('/feedback', adminAuthMiddleware, requirePermission('feedback_view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    let filter = {};
    if (type) filter.type = type;

    const feedback = await Feedback.find(filter)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Feedback.countDocuments(filter);

    res.json({
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});
// ==============================
// Dashboard Analytics
// ==============================
router.get('/dashboard/analytics', adminAuthMiddleware, requirePermission('analytics_view'), async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 📈 User Growth (new users per day)
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 📦 Product Trends (recent products grouped by categoryId)
    const productTrends = await Product.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      {
        $group: {
          _id: "$categoryId",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 🎯 Conversion Funnel (simplified)
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalComplaints = await Complaint.countDocuments();
    const totalFeedback = await Feedback.countDocuments();

    const conversionFunnel = {
      users: totalUsers,
      listings: totalProducts,
      complaints: totalComplaints,
      feedback: totalFeedback
    };

    // 🌍 Geographic Distribution (from User.address)
    const geographicDistribution = await User.aggregate([
      { $match: { address: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: "$address", // e.g., city or region
          users: { $sum: 1 }
        }
      },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);

    // ⏰ Peak Hours (based on lastLoginDate)
    const peakHours = await User.aggregate([
      { $match: { lastLoginDate: { $exists: true } } },
      {
        $group: {
          _id: { $hour: "$lastLoginDate" },
          active: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      analytics: {
        userGrowth: userGrowth.map(u => ({ label: u._id, value: u.count })),
        productTrends: productTrends.map(p => ({
          category: p._id ? p._id.toString() : "Unknown",
          count: p.count
        })),
        conversionFunnel,
        geographicDistribution: geographicDistribution.map(g => ({
          region: g._id,
          users: g.users
        })),
        peakHours: peakHours.map(h => ({
          hour: `${h._id}:00`,
          active: h.active
        }))
      }
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    res.status(500).json({ error: "Failed to get analytics" });
  }
});

// ==============================
// Recent Activity
// ==============================
router.get('/dashboard/activity', adminAuthMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("username createdAt");

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("title createdAt");

    const complaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("status createdAt");

    const feedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("type createdAt");

    const activities = [
      ...users.map(u => ({
        type: "user_registered",
        description: `New user: ${u.username}`,
        timestamp: u.createdAt
      })),
      ...products.map(p => ({
        type: "product_listed",
        description: `New product: ${p.title}`,
        timestamp: p.createdAt
      })),
      ...complaints.map(c => ({
        type: "complaint_filed",
        description: `Complaint status: ${c.status}`,
        timestamp: c.createdAt
      })),
      ...feedback.map(f => ({
        type: "feedback_submitted",
        description: `Feedback received: ${f.type}`,
        timestamp: f.createdAt
      }))
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    res.json({ activities });
  } catch (error) {
    console.error("Dashboard activity error:", error);
    res.status(500).json({ error: "Failed to get recent activity" });
  }
});

// ==============================
// System Health
// ==============================
router.get('/dashboard/health', adminAuthMiddleware, async (req, res) => {
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping(); // real DB check
    const responseTime = Date.now() - start;

    const health = {
      serverStatus: "healthy",
      responseTime,
      uptime: process.uptime()
    };

    res.json({ health });
  } catch (error) {
    console.error("Dashboard health error:", error);
    res.status(500).json({ error: "Failed to get system health" });
  }
});

export default router;