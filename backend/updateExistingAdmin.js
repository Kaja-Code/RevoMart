import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateExistingAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const email = "admin@revomart.com";

    // Find the existing admin user
    const adminUser = await User.findOne({ email });

    if (adminUser) {
      console.log("📋 Found existing admin user:");
      console.log("- Email:", adminUser.email);
      console.log("- Username:", adminUser.username);
      console.log("- Current role:", adminUser.role); // Will show undefined
      
      // Update the role
      adminUser.role = "admin";
      await adminUser.save();

      console.log("✅ Updated admin user:");
      console.log("- New role:", adminUser.role); // Should now show "admin"
      
      // Verify the update
      const updatedUser = await User.findOne({ email });
      console.log("🔍 Verification - Role in database:", updatedUser.role);
      
    } else {
      console.log("❌ Admin user not found with email:", email);
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Update failed:", err);
    process.exit(1);
  }
}

updateExistingAdmin();