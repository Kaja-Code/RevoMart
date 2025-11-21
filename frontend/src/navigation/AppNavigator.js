// navigation/AppNavigator.js
import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../context/AuthContext";

// Auth
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/Auth/ForgotpasswordScreen";

// Core
import HomeScreen from "../screens/Home/HomeScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import InfoFormScreen from "../screens/Home/InfoFormScreen";
import AddProductScreen from "../screens/Home/AddProductScreen";
import ProductDetailsScreen from "../screens/Home/ProductDetailsScreen";
import CartScreen from "../screens/Home/CartScreen";
import MyActivityScreen from "../screens/Home/MyActivityScreen";
import SwapScreen from "../screens/Home/SwapScreen";

// Chat
import ChatListScreen from "../screens/Chat/ChatListScreen";
import ChatScreen from "../screens/Chat/ChatScreen";

// Seller & Notifications (extra)
import SellerDashboardScreen from "../screens/Seller/SellerDashboardScreen.js";
import AllNotificationsScreen from "../screens/Notifications/AllNotificationsScreen";
import NotificationSettingsScreen from "../screens/Notifications/NotificationSettingsScreen";
import FeedbackScreen from "../screens/Feedback/FeedbackScreen";


const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

// Floof-style theme
const themeColors = {
  primary: "#2F6F61", // muted green
  background: "#FFFFFF",
  border: "#E0E6E3",
  muted: "#6C757D",
};

// Bottom Tabs for logged-in users
function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: themeColors.background,
          borderTopWidth: 1,
          borderTopColor: themeColors.border,
          height: 74,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused, size }) => {
          let iconName;
          let color;

          if (route.name === "Home") {
            iconName = "home-variant";
            color = focused ? themeColors.primary : "#A0B5AD";
          } else if (route.name === "Messages") {
            iconName = "message-text";
            color = focused ? "#2F95DC" : "#A0BFD9";
          } else if (route.name === "AddProduct") {
            iconName = "plus-circle";
            color = focused ? "#FF6F61" : "#F5BFB7";
          } else if (route.name === "Dashboard") {
            iconName = "view-dashboard";
            color = focused ? "#F4B400" : "#F9DC88";
          } else if (route.name === "Profile") {
            iconName = "account-circle";
            color = focused ? "#6A5ACD" : "#B6AEDD";
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
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Messages" component={ChatListScreen} />
      <Tabs.Screen name="AddProduct" component={AddProductScreen} />
      <Tabs.Screen name="Dashboard" component={SellerDashboardScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {!user ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <Stack.Screen name="MainTabs" component={MainTabs} />
      )}

      {/* Profile Completion */}
      <Stack.Screen name="InfoForm" component={InfoFormScreen} options={defaultHeader("Complete Profile")} />

      {/* Product Details */}
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={defaultHeader("Product Details")} />

      {/* Cart */}
      <Stack.Screen name="Cart" component={CartScreen} options={defaultHeader("My Cart")} />
      

      {/* Chat */}
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: themeColors.primary },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />

      {/* Extra screens */}
      <Stack.Screen name="MyActivity" component={MyActivityScreen} options={defaultHeader("My Activity")} />
      <Stack.Screen name="Swap" component={SwapScreen} options={defaultHeader("Swap Product")} />

      {/* Notifications */}
      <Stack.Screen
        name="AllNotifications"
        component={AllNotificationsScreen}
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen 
        name="Feedback" 
        component={FeedbackScreen}
        options={{
          headerShown: true,
          title: 'Feedback',
          headerStyle: { backgroundColor: '#2F6F61' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}/>
    </Stack.Navigator>
  );
}

// Auth Stack for logged-out users
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// Helper for headers
function defaultHeader(title) {
  return {
    headerShown: true,
    title,
    headerStyle: { backgroundColor: themeColors.primary },
    headerTintColor: "#fff",
    headerTitleStyle: { fontWeight: "bold" },
  };
}

// Loading Screen
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={themeColors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingBottom: 50,
  },
});
