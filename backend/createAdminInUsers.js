import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import admin from './config/firebase.js';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const email = "admin@revomart.com";
    const password = "Admin@123";
    const username = "superadmin";

    // 1. Create or get Firebase user
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(email);
      console.log("ℹ️ Admin already exists in Firebase:", firebaseUser.uid);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        firebaseUser = await admin.auth().createUser({
          email,
          password,
          displayName: username,
        });
        console.log("✅ Admin created in Firebase:", firebaseUser.uid);
      } else {
        throw error;
      }
    }

    // 2. Create or update admin in Users collection
    let existingAdmin = await User.findOne({ email });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(password, 10);

      const newAdmin = new User({
        username,
        email,
        passwordHash,
        firebaseUid: firebaseUser.uid,
        role: "admin", // Set role as admin
        isVerified: true,
        infoCompleted: true,
      });

      await newAdmin.save();
      console.log("✅ Admin user saved in Users collection");
    } else {
      // Update existing user to admin
      existingAdmin.firebaseUid = firebaseUser.uid;
      existingAdmin.role = "admin";
      existingAdmin.isVerified = true;
      existingAdmin.infoCompleted = true;
      await existingAdmin.save();
      console.log("✅ Updated existing user to admin");
    }

    console.log("🎉 Admin user setup completed!");
    console.log("📧 Email: admin@revomart.com");
    console.log("🔑 Password: Admin@123");
    console.log("👑 Role: admin");
    console.log("🆔 Firebase UID:", firebaseUser.uid);
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Admin setup failed:", err);
    process.exit(1);
  }
}

createAdminUser();