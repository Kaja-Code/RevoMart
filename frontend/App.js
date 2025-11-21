// frontend/App.js - FIXED VERSION
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import 'react-native-gesture-handler';
import AdminNavigator from "./src/navigation/AdminNavigator";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";

function MainApp() {
  const { userDetails, loading, user, userType } = useAuth();

  // Detailed logging for routing decision
  console.log("🚀 MainApp Render - Detailed Debug:");
  console.log("- Loading state:", loading);
  console.log("- Firebase user exists:", !!user);
  console.log("- Firebase user email:", user?.email);
  console.log("- UserDetails exists:", !!userDetails);
  console.log("- UserType:", userType);
  console.log("- UserDetails.role:", userDetails?.role);

  // Show loading screen while checking authentication
  if (loading) {
    console.log("⏳ Showing loading screen");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6F61" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If no user is logged in, show auth screens
  if (!user || !userDetails) {
    console.log("❌ No user/userDetails - showing login screen");
    return <AppNavigator />;
  }

  // FIXED: Check if user is admin (either 'admin' or 'super_admin' userType)
  console.log("🎯 ROUTING DECISION:");
  const isAdmin = userType === 'admin' || userDetails?.role === 'admin' || userDetails?.role === 'super_admin';
  
  if (isAdmin) {
    console.log("✅ ROUTING TO ADMIN INTERFACE");
    console.log("- UserType:", userType);
    console.log("- Role:", userDetails.role);
    return <AdminNavigator />;
  } else {
    console.log("👤 ROUTING TO USER INTERFACE");
    console.log("- UserType:", userType);
    console.log("- Role:", userDetails.role);
    return <AppNavigator />;
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});