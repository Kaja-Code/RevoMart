// Sidebar.js (Unified with theme style + working logic)
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { signOut as firebaseSignOut } from "firebase/auth";
import authfirebase from "../../services/firebaseAuth";
import { useAuth } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");

export default function Sidebar({ sidebarAnim, onClose }) {
  const navigation = useNavigation();
  const { user, userDetails, signOut } = useAuth();

  const logout = async () => {
    try {
      await firebaseSignOut(authfirebase);
      console.log("User logged out successfully");
      // You can also clear context/local storage if needed
      if (signOut) signOut();
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            width: width * 0.75,
            transform: [{ translateX: sidebarAnim }],
          },
        ]}
      >
        {/* User Info */}
        <View style={styles.userInfo}>
          <Image
            source={
              userDetails?.profilePictureUrl
                ? { uri: userDetails.profilePictureUrl }
                : require("../../assets/Profile.png")
            }
            style={styles.profileImage}
          />
          <View style={styles.userDetails}>
            <Text style={styles.username}>
              {userDetails?.username || user?.username || "Guest User"}
            </Text>
            <Text style={styles.email}>
              {user?.email || "guest@example.com"}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <SidebarItem
          icon="home"
          label="Home"
          onPress={() => navigation.navigate("Home")}
        />
        <SidebarItem
          icon="person"
          label="Profile"
          onPress={() => navigation.navigate("Profile")}
        />
        <SidebarItem
          icon="receipt-long"
          label="My Orders"
          onPress={() => navigation.navigate("Orders")}
        />
        <SidebarItem
          icon="shopping-cart"
          label="My Cart"
          onPress={() => navigation.navigate("Cart")}
        />
        <SidebarItem
          icon="history"
          label="My Activity"
          onPress={() => navigation.navigate("MyActivity")}
        />
        <SidebarItem
          icon="add-box"
          label="Add Product"
          onPress={() => navigation.navigate("AddProduct")}
        />
        <SidebarItem
          icon="settings"
          label="Settings"
          onPress={() => navigation.navigate("Settings")}
        />
       <SidebarItem
          icon="message-text"
          label="Feedback"
          onPress={() => {
            navigation.navigate("Feedback");
            onClose();
          }}
        />
        <SidebarItem
          icon="logout"
          label="Logout"
          highlight
          onPress={confirmLogout}
        />
      </Animated.View>
    </>
  );
}

function SidebarItem({ icon, label, onPress, highlight = false }) {
  return (
    <TouchableOpacity style={styles.sidebarItem} onPress={onPress}>
      <MaterialIcons
        name={icon}
        size={22}
        color={highlight ? "#C0392B" : "#2F6F61"} // red for logout
        style={styles.icon}
      />
      <Text
        style={[
          styles.sidebarText,
          highlight && { color: "#C0392B", fontWeight: "700" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 9,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingHorizontal: 20,
    zIndex: 10,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    padding: 12,
    backgroundColor: "#E8F0EC",
    borderRadius: 16,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 40,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#2F6F61",
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F2F2F",
  },
  email: {
    fontSize: 13,
    color: "#6C757D",
    marginTop: 2,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomColor: "#F0F0F0",
    borderBottomWidth: 1,
  },
  sidebarText: {
    fontSize: 16,
    color: "#2F2F2F",
  },
  icon: {
    marginRight: 15,
  },
});
