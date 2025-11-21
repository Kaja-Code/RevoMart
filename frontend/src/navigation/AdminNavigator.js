// frontend/src/navigation/AdminNavigator.js - UPDATED FOR UNIFIED AUTH
import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../context/AuthContext"; // Using unified context now

// Import admin screens
import AdminDashboardScreen from "../screens/Admin/AdminDashboardScreen.js";
import AdminUsersScreen from "../screens/Admin/AdminUsersScreen";
import AdminProductsScreen from "../screens/Admin/AdminProductsScreen";
import AdminComplaintsScreen from "../screens/Admin/AdminComplaintsScreen";
import AdminFeedbackScreen from "../screens/Admin/AdminFeedbackScreen";
import AdminProfileScreen from "../screens/Admin/AdminProfileScreen";

// Import auth screens (reuse existing)
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/Auth/LoginScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

// Admin Bottom Tabs
function AdminTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 74,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused, size }) => {
          let iconName;
          let color;

          if (route.name === "Dashboard") {
            iconName = "view-dashboard";
            color = focused ? "#2F6F61" : "#A0B5AD";
          } else if (route.name === "Users") {
            iconName = "account-group";
            color = focused ? "#2F6F61" : "#A0B5AD";
          } else if (route.name === "Products") {
            iconName = "package-variant";
            color = focused ? "#2F6F61" : "#A0B5AD";
          } else if (route.name === "Complaints") {
            iconName = "alert-circle";
            color = focused ? "#2F6F61" : "#A0B5AD";
          } else if (route.name === "Profile") {
            iconName = "account-circle";
            color = focused ? "#2F6F61" : "#A0B5AD";
          }

          return (
            <MaterialCommunityIcons
              name={iconName}
              size={size + 5}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tabs.Screen name="Users" component={AdminUsersScreen} />
      <Tabs.Screen name="Products" component={AdminProductsScreen} />
      <Tabs.Screen name="Complaints" component={AdminComplaintsScreen} />
      <Tabs.Screen name="Profile" component={AdminProfileScreen} />
    </Tabs.Navigator>
  );
}

// Admin Navigator
export default function AdminNavigator() {
  const { user, loading } = useAuth(); // Using unified context

  if (loading) return <LoadingScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
          <Stack.Screen name="AdminFeedback" component={AdminFeedbackScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// Loading Screen
function LoadingScreen() {
  return (
    <View style={loadingStyles.container}>
      <ActivityIndicator size="large" color="#2F6F61" />
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});