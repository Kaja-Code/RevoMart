import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    firebaseUid: { type: String, unique: true, sparse: true },
    role: { 
      type: String, 
      enum: ['admin', 'super_admin'], 
      default: 'admin' 
    },
    permissions: [{
      type: String,
      enum: [
        'users_manage',
        'products_manage', 
        'complaints_manage',
        'feedback_view',
        'analytics_view'
      ]
    }],
    isActive: { type: Boolean, default: true },
    lastLoginDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

// Method to compare passwords
adminSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Method to get default permissions based on role
adminSchema.methods.getDefaultPermissions = function () {
  if (this.role === 'super_admin') {
    return ['users_manage', 'products_manage', 'complaints_manage', 'feedback_view', 'analytics_view'];
  } else if (this.role === 'admin') {
    return ['users_manage', 'products_manage', 'complaints_manage', 'feedback_view'];
  }
  return [];
};

// Pre-save middleware to set default permissions
adminSchema.pre('save', function(next) {
  if (this.isNew && this.permissions.length === 0) {
    this.permissions = this.getDefaultPermissions();
  }
  next();
});

export default mongoose.model('Admin', adminSchema);