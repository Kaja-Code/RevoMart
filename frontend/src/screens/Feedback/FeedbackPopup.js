import React from "react";
import { Modal, View, TouchableOpacity, Text, StyleSheet, Dimensions } from "react-native";
import FeedbackScreen from "./FeedbackScreen";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const { width, height } = Dimensions.get('window');

// Theme matching the FeedbackScreen
const theme = {
  primary: "#006D77",
  primaryLight: "#83C5BE",
  accent: "#FFD166",
  background: "#F8F9FA",
  card: "#FFFFFF",
  border: "#E9ECEF",
  muted: "#6C757D",
  text: "#212529",
};

export default function FeedbackPopup({ visible, onClose }) {
  return (
    <Modal 
      visible={visible} 
      animationType="fade" 
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Enhanced Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.titleContainer}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons 
                    name="message-text" 
                    size={24} 
                    color={theme.primary} 
                  />
                </View>
                <View>
                  <Text style={styles.title}>Share Your Feedback</Text>
                  <Text style={styles.subtitle}>Help us improve your experience</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={22} 
                  color={theme.muted} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Feedback Content */}
          <View style={styles.content}>
            <FeedbackScreen onSubmitted={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.card,
    width: "100%",
    maxWidth: 400,
    height: "90%",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  header: {
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: theme.muted,
    fontWeight: "400",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${theme.muted}10`,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  content: {
    flex: 1,
    backgroundColor: theme.background,
  },
});