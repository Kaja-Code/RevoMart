// backend/seedAdmin.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import admin from "./config/firebase.js"; // firebase-admin SDK
import Admin from "./models/Admin.js";   // your Admin mongoose model
import dotenv from "dotenv";

dotenv.config();

async function seedAdmin() {
  try {
    // 1. Connect MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const email = "admin@revomart.com";
    const password = "Admin@123";
    const username = "superadmin";

    // 2. Check if admin already exists in Firebase
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(email);
      console.log("ℹ️ Admin already exists in Firebase:", firebaseUser.uid);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // Create user in Firebase
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

    // 3. Ensure admin exists in MongoDB
    const existingAdmin = await Admin.findOne({ email });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(password, 10);

      const newAdmin = new Admin({
        username,
        email,
        passwordHash,
        firebaseUid: firebaseUser.uid,
        role: "super_admin",
        permissions: [
          "users_manage",
          "products_manage",
          "complaints_manage",
          "feedback_view",
          "analytics_view",
        ],
        isActive: true,
      });

      await newAdmin.save();
      console.log("✅ Admin saved in MongoDB");
    } else {
      // update firebaseUid if missing
      if (!existingAdmin.firebaseUid) {
        existingAdmin.firebaseUid = firebaseUser.uid;
        await existingAdmin.save();
        console.log("✅ Updated existing Admin with firebaseUid");
      } else {
        console.log("ℹ️ Admin already exists in MongoDB");
      }
    }

    console.log("🎉 Seeding completed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seedAdmin();
