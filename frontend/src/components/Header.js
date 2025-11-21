import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function Header({ onMenuPress }) {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>
        <Text style={styles.logoPrimary}>Revo</Text>
        <Text style={styles.logoSecondary}>Mart</Text>
      </Text>
      <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress}>
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    marginTop: -50,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "#E8F0EC", // muted green background
    borderBottomWidth: 0,
    borderTopWidth:0,
    borderColor: "#E8F0EC",
    // borderBottomColor: "#D9E2DC",
    //
    borderBottomColor: "#D9E2DC",
  },
  logo: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  logoPrimary: {
    color: "#2F6F61", // muted green
  },
  logoSecondary: {
    color: "#333", // dark gray for contrast
  },
  menuBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    fontSize: 20,
    color: "#2F2F2F",
  },
});
