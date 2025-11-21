import admin from "../config/firebase.js";
import Admin from "../models/Admin.js";

export async function adminAuthMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ error: "Missing token" });

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Find admin in MongoDB by firebaseUid
    const adminDoc = await Admin.findOne({ 
      firebaseUid: decodedToken.uid,
      isActive: true 
    });
    
    if (!adminDoc) {
      return res.status(401).json({ error: "Admin access denied" });
    }

    // Attach admin info to request
    req.adminId = adminDoc._id;
    req.adminEmail = adminDoc.email;
    req.adminRole = adminDoc.role;
    req.adminPermissions = adminDoc.permissions.length > 0 ? adminDoc.permissions : adminDoc.getDefaultPermissions();

    next();
  } catch (error) {
    console.error("Admin auth error:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.adminPermissions || !req.adminPermissions.includes(permission)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}