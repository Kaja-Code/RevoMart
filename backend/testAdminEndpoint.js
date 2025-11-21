import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAdminEndpoint() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Find admin by Firebase UID (this is what your API does)
    const adminUser = await User.findOne({ 
      firebaseUid: "9IEdvaJeIMSzH8Kl8lhdNOI8C6h2" // Replace with actual UID
    });

    console.log("🔍 Testing what your API endpoint returns:");
    
    if (adminUser) {
      console.log("✅ User found:");
      console.log("- Raw database object:", adminUser.toObject());
      console.log("- Role field:", adminUser.role);
      console.log("- Role type:", typeof adminUser.role);
      
      // Simulate API response
      const apiResponse = {
        user: {
          _id: adminUser._id,
          username: adminUser.username,
          email: adminUser.email,
          phoneNumber: adminUser.phoneNumber,
          bio: adminUser.bio,
          address: adminUser.address,
          profilePictureUrl: adminUser.profilePictureUrl,
          ratingAverage: adminUser.ratingAverage,
          favoriteProducts: adminUser.favoriteProducts,
          infoCompleted: adminUser.infoCompleted,
          registrationDate: adminUser.registrationDate,
          lastLoginDate: adminUser.lastLoginDate,
          role: adminUser.role // This should be included
        }
      };
      
      console.log("📦 Simulated API response:", apiResponse);
    } else {
      console.log("❌ User not found");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  }
}

testAdminEndpoint();