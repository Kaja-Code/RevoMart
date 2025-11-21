import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ role: 'super_admin' });
    if (existingAdmin) {
      console.log('Super admin already exists');
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash('Admin@123', 10);
    
    const superAdmin = await Admin.create({
      username: 'superadmin',
      email: 'admin@revomart.com',
      passwordHash,
      role: 'super_admin',
      permissions: ['users_manage', 'products_manage', 'complaints_manage', 'feedback_view', 'analytics_view'],
      isActive: true
    });

    console.log('Super admin created successfully');
    console.log('Email: admin@revomart.com');
    console.log('Password: Admin@123');
    console.log('Please change the password after first login');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();