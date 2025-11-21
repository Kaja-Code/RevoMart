import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import authfirebase from '../../services/firebaseAuth';
import { API_URL } from "../constants/config";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const [userType, setUserType] = useState(null); // 'user' or 'admin'

  // Fetch fresh user data from backend
  const refreshUserDetails = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();

      // Check Admin collection first
      const adminRes = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: firebaseUser.uid }),
      });
      const adminData = await adminRes.json();

      if (adminRes.ok && adminData.admin) {
        const mappedAdmin = {
          _id: adminData.admin._id,
          username: adminData.admin.username,
          email: adminData.admin.email,
          role: adminData.admin.role,
          permissions: adminData.admin.permissions || [],
          isActive: adminData.admin.isActive,
          lastLoginDate: adminData.admin.lastLoginDate,
        };
        setUserDetails(mappedAdmin);
        setUserType('admin');
        return;
      }

      // Check User collection
      const userRes = await fetch(`${API_URL}/api/auth/user/${firebaseUser.uid}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const userData = await userRes.json();

      if (userRes.ok && userData.user) {
        const mappedUser = {
          _id: userData.user._id,
          username: userData.user.username,
          email: userData.user.email,
          role: userData.user.role || 'user',
          favoriteProducts: userData.user.favoriteProducts || [],
          phoneNumber: userData.user.phoneNumber || '',
          infoCompleted: userData.user.infoCompleted,
          registrationDate: userData.user.registrationDate,
          lastLoginDate: userData.user.lastLoginDate,
          ratingAverage: userData.user.ratingAverage,
          profilePictureUrl: userData.user.profilePictureUrl,
          address: userData.user.address,
          bio: userData.user.bio,
        };
        setUserDetails(mappedUser);
        setUserType('user');
      } else {
        setUserDetails(null);
        setUserType(null);
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
      setUserDetails(null);
      setUserType(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authfirebase, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await refreshUserDetails(firebaseUser);
      } else {
        setUser(null);
        setUserDetails(null);
        setUserType(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(authfirebase);
      setUser(null);
      setUserDetails(null);
      setUserType(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      loading,
      userDetails,
      setUserDetails,
      userType,
      logout,
      isAdmin: userType === 'admin',
      isUser: userType === 'user',
      refreshUserDetails,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
