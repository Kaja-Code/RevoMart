// Layout.js
import React, { useState, useRef } from "react";
import { View, StyleSheet, Dimensions, Animated, StatusBar } from "react-native";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

const { width } = Dimensions.get("window");

export default function Layout({ children }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-width * 0.7)).current;

  const toggleSidebar = () => {
    if (sidebarVisible) {
      Animated.timing(sidebarAnim, {
        toValue: -width * 0.7,
        duration: 300,
        useNativeDriver: false,
      }).start(() => setSidebarVisible(false));
    } else {
      setSidebarVisible(true);
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const closeSidebar = () => {
    if (sidebarVisible) toggleSidebar();
  };

  return (
    <View style={styles.container}>
      {/* Status bar in Floof-style muted color */}
      <StatusBar barStyle="dark-content" backgroundColor="#E8F0EC" />
      
      {/* Header */}
      <Header onMenuPress={toggleSidebar} />
      
      {/* Main content */}
      <View style={styles.content}>{children}</View>

      {/* Sidebar */}
      {sidebarVisible && (
        <Sidebar sidebarAnim={sidebarAnim} onClose={closeSidebar} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7F6", // Muted greenish tone like Floof
    paddingTop: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF", // White card-style for contrast
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
});
