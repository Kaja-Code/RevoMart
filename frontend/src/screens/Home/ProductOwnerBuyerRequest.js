// frontend/src/components/ProductOwnerBuyerRequest.jsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { API_URL } from "../../constants/config";
import { Ionicons } from "@expo/vector-icons";

const theme = {
  primary: "#2F6F61",
  primaryLight: "#E8F5F2",
  accent: "#FF6F61",
  accentLight: "#FFEFED",
  danger: "#D32F2F",
  dangerLight: "#FBEAEA",
  success: "#10B981",
  successLight: "#ECFDF5",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  background: "#F8FAFC",
  card: "#FFFFFF",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
};

// See More Component
const SeeMoreButton = ({ expanded, onPress, count }) => (
  <TouchableOpacity style={styles.seeMoreButton} onPress={onPress}>
    <Text style={styles.seeMoreText}>
      {expanded ? "Show Less" : `See More (${count})`}
    </Text>
    <Ionicons 
      name={expanded ? "chevron-up" : "chevron-down"} 
      size={16} 
      color={theme.primary} 
    />
  </TouchableOpacity>
);

// Expandable List Component for Buy Requests
const ExpandableBuyRequestsList = ({ items, renderItem, itemsPerPage = 5 }) => {
  const [expanded, setExpanded] = useState(false);
  
  const displayedItems = expanded 
    ? items 
    : items.slice(0, 1); // Show only 1 item initially

  const remainingCount = items.length - 1;

  if (items.length === 0) {
    return null;
  }

  return (
    <View>
      {displayedItems.map(renderItem)}
      
      {items.length > 1 && (
        <SeeMoreButton 
          expanded={expanded}
          onPress={() => setExpanded(!expanded)}
          count={remainingCount}
        />
      )}
    </View>
  );
};

export default function ProductOwnerBuyerRequest({ requests, user, onRefresh }) {
  const navigation = useNavigation();

  const getAuthHeaders = async () => {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  const cancelBuy = async (req) => {
    try {
      const headers = await getAuthHeaders();
      await axios.patch(
        `${API_URL}/api/products/${req.product._id}/buy/${req._id}/cancel`,
        {},
        { headers }
      );
      onRefresh();
    } catch (err) {
      console.log("Cancel buy error:", err.response?.data || err.message);
    }
  };

  const respondBuy = async (req, action) => {
    try {
      const headers = await getAuthHeaders();
      await axios.patch(
        `${API_URL}/api/products/${req.product._id}/buy/${req._id}/respond`,
        { status: action },
        { headers }
      );
      onRefresh();
    } catch (err) {
      console.log("Respond buy error:", err.response?.data || err.message);
    }
  };

  // Current user's identifiers
  const currentUserDbId = user.dbId; // From backend (Mongo _id)
  const currentUserUid = user.uid;   // Firebase UID

  // Filter requests
  const sentRequests = requests.filter(
    r => r.buyerId === currentUserDbId || r.buyerId === currentUserUid
  );

  const receivedRequests = requests.filter(
    r => r.sellerId === currentUserDbId || r.sellerId === currentUserUid
  );

  const getStatusConfig = (status) => {
    switch (status) {
      case "pending": return { color: theme.warning, bg: theme.warningLight, icon: "time-outline" };
      case "accepted": return { color: theme.success, bg: theme.successLight, icon: "checkmark-circle-outline" };
      case "rejected": return { color: theme.danger, bg: theme.dangerLight, icon: "close-circle-outline" };
      case "cancelled": return { color: theme.textMuted, bg: theme.borderLight, icon: "ban-outline" };
      default: return { color: theme.textMuted, bg: theme.borderLight, icon: "help-circle-outline" };
    }
  };

  // Render card for each request
  const renderRequestCard = (req, type) => {
    const statusConfig = getStatusConfig(req.status);
    
    return (
      <View key={req._id} style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.requestTypeBadge}>
            <Ionicons 
              name={type === "sent" ? "arrow-up-outline" : "arrow-down-outline"} 
              size={14} 
              color={type === "sent" ? theme.primary : theme.accent} 
            />
            <Text style={[styles.requestTypeText, { color: type === "sent" ? theme.primary : theme.accent }]}>
              {type === "sent" ? "Request Sent" : "Request Received"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Product Info */}
        <TouchableOpacity
          style={styles.productSection}
          onPress={() => navigation.navigate("ProductDetails", { product: req.product })}
        >
          {req.product.imagesUrls?.[0] ? (
            <Image source={{ uri: req.product.imagesUrls[0] }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="image-outline" size={24} color={theme.textMuted} />
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>{req.product.title}</Text>
            <Text style={styles.productPrice}>LKR {req.product.price?.toLocaleString() || "N/A"}</Text>
            <View style={styles.productCondition}>
              <Ionicons name="hammer-outline" size={12} color={theme.textSecondary} />
              <Text style={styles.conditionText}>{req.product.condition || "N/A"}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <View style={styles.contactRow}>
            <Ionicons name="person-outline" size={14} color={theme.textSecondary} />
            <Text style={styles.contactLabel}>
              {type === "sent" ? "Seller" : "Buyer"}:
            </Text>
            <Text style={styles.contactValue}>
              {type === "sent" ? req.sellerName : req.buyerName}
            </Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={14} color={theme.textSecondary} />
            <Text style={styles.contactLabel}>Contact:</Text>
            <Text style={styles.contactValue}>
              {type === "sent" ? req.sellerContact : req.buyerContact}
            </Text>
          </View>
          {/* Show Buy Product details if request accepted */}
          {/* {type === "sent" && req.status === "accepted" && req.product && (
            <View style={styles.buyProductSection}>
              <View style={styles.buyProductHeader}>
                <Ionicons name="cart-outline" size={16} color={theme.primary} />
                <Text style={styles.buyProductTitle}>Buy Product Details</Text>
              </View>
              <View style={styles.buyProductContent}>
                {req.product.imagesUrls?.[0] ? (
                  <Image
                    source={{ uri: req.product.imagesUrls[0] }}
                    style={styles.buyProductImage}
                  />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Ionicons name="image-outline" size={24} color={theme.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.buyProductName} numberOfLines={2}>
                    {req.product.title}
                  </Text>
                  <Text style={styles.buyProductPrice}>
                    LKR {req.product.price?.toLocaleString() || "N/A"}
                  </Text>
                  <Text style={styles.buyProductCondition}>
                    Condition: {req.product.condition || "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          )} */}

        </View>

        {/* Action Buttons */}
        {type === "sent" && req.status === "pending" && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => cancelBuy(req)}
          >
            <Ionicons name="close-circle" size={16} color={theme.danger} />
            <Text style={styles.cancelButtonText}>Cancel Buy Request</Text>
          </TouchableOpacity>
        )}

        {type === "received" && req.status === "pending" && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => respondBuy(req, "accepted")}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => respondBuy(req, "rejected")}
            >
              <Ionicons name="close" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
        
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sent Requests Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="arrow-up-circle" size={20} color={theme.primary} />
          <Text style={styles.sectionTitle}>Buy Requests You Sent</Text>
          <Text style={styles.sectionCount}>({sentRequests.length})</Text>
        </View>
        {sentRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color={theme.border} />
            <Text style={styles.emptyText}>No buy requests sent</Text>
            <Text style={styles.emptySubtext}>
              When you send buy requests, they'll appear here
            </Text>
          </View>
        ) : (
          <ExpandableBuyRequestsList 
            items={sentRequests}
            renderItem={(req) => renderRequestCard(req, "sent")}
          />
        )}
      </View>

      {/* Received Requests Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="arrow-down-circle" size={20} color={theme.accent} />
          <Text style={styles.sectionTitle}>Buy Requests Received</Text>
          <Text style={styles.sectionCount}>({receivedRequests.length})</Text>
        </View>
        {receivedRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color={theme.border} />
            <Text style={styles.emptyText}>No buy requests received</Text>
            <Text style={styles.emptySubtext}>
              Buy requests from other users will appear here
            </Text>
          </View>
        ) : (
          <ExpandableBuyRequestsList 
            items={receivedRequests}
            renderItem={(req) => renderRequestCard(req, "received")}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.textPrimary,
    marginLeft: 8,
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.textMuted,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: theme.card,
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: "center",
    color: theme.textMuted,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
  },
  emptySubtext: {
    textAlign: "center",
    color: theme.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  requestTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.borderLight,
  },
  requestTypeText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  productSection: {
    flexDirection: "row",
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: theme.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.accent,
    marginBottom: 4,
  },
  productCondition: {
    flexDirection: "row",
    alignItems: "center",
  },
  conditionText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginLeft: 4,
  },
  contactSection: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.textSecondary,
    marginLeft: 6,
    marginRight: 4,
    width: 60,
  },
  contactValue: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.textPrimary,
    flex: 1,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.dangerLight,
    gap: 8,
  },
  cancelButtonText: {
    color: theme.danger,
    fontWeight: "600",
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: theme.success,
  },
  rejectButton: {
    backgroundColor: theme.danger,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  buyProductSection: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  buyProductHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  buyProductTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textPrimary,
    marginLeft: 6,
  },
  buyProductContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buyProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  buyProductName: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 4,
  },
  buyProductPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.accent,
    marginBottom: 4,
  },
  buyProductCondition: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  seeMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: theme.primaryLight,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  seeMoreText: {
    color: theme.primary,
    fontWeight: "600",
    fontSize: 14,
    marginRight: 8,
  },
});