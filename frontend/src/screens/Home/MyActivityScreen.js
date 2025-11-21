// frontend/src/screens/Home/MyActivityScreen.jsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
} from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";
import Layout from "../../components/Layouts";
import ProductOwnerBuyerRequest from "./ProductOwnerBuyerRequest";
import { Ionicons } from "@expo/vector-icons";

// Enhanced theme colors
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

// Expandable List Component
const ExpandableList = ({ items, renderItem, itemsPerPage = 5 }) => {
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

export default function MyActivityScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [myProducts, setMyProducts] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [buyRequests, setBuyRequests] = useState([]);

  const sectionPositions = useRef({});
  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const availableCount = myProducts.filter((p) => p.status === "available").length;
  const soldCount = myProducts.filter((p) => p.status === "sold").length;
  const swappedCount = myProducts.filter((p) => p.status === "swapped").length;
  const pendingRequestsCount = swapRequests.filter((r) => r.status === "pending").length;
  const buyRequestsCount = buyRequests.filter(r => r.status === "pending").length;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const scrollToSection = (key) => {
    if (scrollRef.current && sectionPositions.current[key] !== undefined) {
      scrollRef.current.scrollTo({
        y: sectionPositions.current[key] - 20,
        animated: true,
      });
    }
  };

  const handleLayout = (key, event) => {
    sectionPositions.current[key] = event.nativeEvent.layout.y;
  };

  const fetchMyProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products?all=true`);
      const filtered = (res.data || []).filter(
        (p) => p.ownerId?.firebaseUid === user?.uid
      );
      setMyProducts(filtered);
    } catch (err) {
      console.log("Error fetching my products:", err.response?.data || err.message);
      setMyProducts([]);
    }
  };

  const fetchSwapRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products?all=true`);
      const allProducts = res.data || [];
      const requests = [];

      allProducts.forEach((product) => {
        if (!product.swapRequests) return;

        product.swapRequests.forEach((req) => {
          if (req.buyerId === user.uid || product.ownerId?.firebaseUid === user.uid) {
            const buyerProduct = allProducts.find((p) => 
              p._id === req.buyerProductId && p.ownerId?.firebaseUid === req.buyerId
            );

            requests.push({
              ...req,
              sellerProduct: product,
              buyerProduct: buyerProduct || { 
                _id: req.buyerProductId, 
                title: "Product Not Available", 
                imagesUrls: [], 
                price: 0, 
                condition: "N/A" 
              },
              sellerId: product.ownerId?.firebaseUid,
              buyerId: req.buyerId,
            });
          }
        });
      });

      const statusOrder = { pending: 1, accepted: 2, rejected: 3, cancelled: 4 };
      requests.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

      setSwapRequests(requests);
    } catch (err) {
      console.log("Error fetching swaps:", err.response?.data || err.message);
      setSwapRequests([]);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchMyProducts(), fetchSwapRequests(), fetchBuyRequests()])
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    onRefresh();
  }, []);

  const formatPrice = (price) => {
    if (!price) return "N/A";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const cancelSwap = async (req) => {
    try {
      await axios.patch(
        `${API_URL}/api/products/${req.sellerProduct._id}/swap/${req._id}/cancel`,
        { userId: user.uid }
      );
      fetchSwapRequests();
    } catch (err) {
      console.log("Cancel swap error:", err);
    }
  };

  const respondSwap = async (req, action) => {
    try {
      await axios.patch(
        `${API_URL}/api/products/${req.sellerProduct._id}/swap/${req._id}/respond`,
        { status: action, userId: user.uid }
      );

      setSwapRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: action } : r))
      );

      if (action === "accepted") {
        setMyProducts((prev) =>
          prev.map((p) =>
            p._id === req.sellerProduct._id ? { ...p, status: "swapped" } : p
          )
        );
      }
    } catch (err) {
      console.log("Respond swap error:", err.response?.data || err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available": return { bg: theme.successLight, text: theme.success, icon: "checkmark-circle" };
      case "sold": return { bg: theme.accentLight, text: theme.accent, icon: "cart" };
      case "swapped": return { bg: theme.warningLight, text: theme.warning, icon: "swap-horizontal" };
      case "pending": return { bg: theme.warningLight, text: theme.warning, icon: "time" };
      default: return { bg: theme.borderLight, text: theme.textMuted, icon: "help" };
    }
  };

  const renderProductCard = (item) => {
    const statusColor = getStatusColor(item.status);
    return (
      <TouchableOpacity
        key={item._id}
        style={styles.card}
        onPress={() => navigation.navigate("ProductDetails", { product: item })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.statusBadge}>
            <Ionicons name={statusColor.icon} size={14} color={statusColor.text} />
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          {item.imagesUrls?.[0] ? (
            <Image source={{ uri: item.imagesUrls[0] }} style={styles.cardImage} />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color={theme.textMuted} />
            </View>
          )}
          
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardPrice}>LKR {formatPrice(item.price)}</Text>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="hammer-outline" size={12} color={theme.textSecondary} />
                <Text style={styles.metaText}>{item.condition}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSoldProductCard = (item) => {
    // Find related buy requests for this sold product
    const relatedBuyRequests = buyRequests.filter(
      req => req.product._id === item._id && req.status === "accepted"
    );
    
    return (
      <View key={item._id} style={styles.soldCard}>
        {/* Product Info */}
        <TouchableOpacity
          style={styles.soldProductSection}
          onPress={() => navigation.navigate("ProductDetails", { product: item })}
        >
          {item.imagesUrls?.[0] ? (
            <Image source={{ uri: item.imagesUrls[0] }} style={styles.soldProductImage} />
          ) : (
            <View style={styles.soldProductImagePlaceholder}>
              <Ionicons name="image-outline" size={24} color={theme.textMuted} />
            </View>
          )}
          <View style={styles.soldProductInfo}>
            <Text style={styles.soldProductTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.soldProductPrice}>LKR {formatPrice(item.price)}</Text>
            <View style={styles.soldProductMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="hammer-outline" size={12} color={theme.textSecondary} />
                <Text style={styles.metaText}>{item.condition}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Buyer Information from Buy Requests */}
        <View style={styles.buyerSection}>
          <View style={styles.buyerHeader}>
            <Ionicons name="person-circle-outline" size={16} color={theme.primary} />
            <Text style={styles.buyerTitle}>Buyer Information</Text>
          </View>
          
          {relatedBuyRequests.length > 0 ? (
            relatedBuyRequests.map((buyReq) => (
              <View key={buyReq._id} style={styles.buyerFromRequest}>
                <View style={styles.buyerDetails}>
                  <View style={styles.buyerRow}>
                    <Ionicons name="person-outline" size={14} color={theme.textSecondary} />
                    <Text style={styles.buyerLabel}>Name:</Text>
                    <Text style={styles.buyerValue}>{buyReq.buyerName || "Not available"}</Text>
                  </View>
                  <View style={styles.buyerRow}>
                    <Ionicons name="call-outline" size={14} color={theme.textSecondary} />
                    <Text style={styles.buyerLabel}>Contact:</Text>
                    <Text style={styles.buyerValue}>{buyReq.buyerContact || "Not available"}</Text>
                  </View>
                  <View style={styles.requestStatus}>
                    <View style={[styles.statusPill, { backgroundColor: theme.successLight }]}>
                      <Text style={[styles.statusPillText, { color: theme.success }]}>
                        Sold via Buy Request
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noBuyerInfo}>
              <Ionicons name="information-circle-outline" size={16} color={theme.warning} />
              <Text style={styles.noBuyerText}>
                No buy request information available. This product was likely sold through direct contact.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSwapRequestCard = (req) => (
    <View key={req._id} style={styles.swapCard}>
      <View style={styles.swapHeader}>
        <Text style={styles.swapTitle}>
          {req.buyerId === user.uid ? "Your Swap Request" : "Incoming Swap Request"}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: getStatusColor(req.status).bg }]}>
          <Text style={[styles.statusPillText, { color: getStatusColor(req.status).text }]}>
            {req.status}
          </Text>
        </View>
      </View>

      <View style={styles.swapProducts}>
        <View style={styles.swapProduct}>
          <Text style={styles.swapProductLabel}>
            {req.buyerId === user.uid ? "Seller's Product" : "Your Product"}
          </Text>
          <TouchableOpacity
            style={styles.productPreview}
            onPress={() => navigation.navigate("ProductDetails", { product: req.sellerProduct })}
          >
            {req.sellerProduct.imagesUrls?.[0] ? (
              <Image source={{ uri: req.sellerProduct.imagesUrls[0] }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewImagePlaceholder}>
                <Ionicons name="image-outline" size={20} color={theme.textMuted} />
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle} numberOfLines={1}>{req.sellerProduct.title}</Text>
              <Text style={styles.previewPrice}>LKR {formatPrice(req.sellerProduct.price)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Ionicons name="swap-horizontal" size={20} color={theme.primary} style={styles.swapIcon} />

        <View style={styles.swapProduct}>
          <Text style={styles.swapProductLabel}>
            {req.buyerId === user.uid ? "Your Product" : "Buyer's Product"}
          </Text>
          <TouchableOpacity
            style={styles.productPreview}
            onPress={() => navigation.navigate("ProductDetails", { product: req.buyerProduct })}
          >
            {req.buyerProduct.imagesUrls?.[0] ? (
              <Image source={{ uri: req.buyerProduct.imagesUrls[0] }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewImagePlaceholder}>
                <Ionicons name="image-outline" size={20} color={theme.textMuted} />
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle} numberOfLines={1}>{req.buyerProduct.title}</Text>
              <Text style={styles.previewPrice}>LKR {formatPrice(req.buyerProduct.price)}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {req.buyerId === user.uid ? (
        // Buyer View
        req.status === "pending" && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => cancelSwap(req)}
          >
            <Ionicons name="close-circle" size={16} color={theme.danger} />
            <Text style={styles.cancelButtonText}>Cancel Request</Text>
          </TouchableOpacity>
        )
      ) : (
        // Seller View
        req.status === "pending" && (
          <View style={styles.swapActions}>
            <Text style={styles.requestNote}>
              {req.buyerName} wants to swap with you
            </Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => respondSwap(req, "accepted")}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => respondSwap(req, "rejected")}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      )}
    </View>
  );

  const renderCompletedSwapCard = (req) => (
    <View key={req._id} style={styles.swapCard}>
      <View style={styles.swapHeader}>
        <Text style={styles.swapTitle}>
          {req.buyerId === user.uid ? "Your Successful Swap" : "Completed Swap"}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: theme.successLight }]}>
          <Text style={[styles.statusPillText, { color: theme.success }]}>
            Completed
          </Text>
        </View>
      </View>

      <View style={styles.swapProducts}>
        <View style={styles.swapProduct}>
          <Text style={styles.swapProductLabel}>
            {req.buyerId === user.uid ? "You Received" : "Your Product"}
          </Text>
          <TouchableOpacity
            style={styles.productPreview}
            onPress={() => navigation.navigate("ProductDetails", { product: req.buyerId === user.uid ? req.sellerProduct : req.buyerProduct })}
          >
            {req.buyerId === user.uid ? (
              <>
                {req.sellerProduct.imagesUrls?.[0] ? (
                  <Image source={{ uri: req.sellerProduct.imagesUrls[0] }} style={styles.previewImage} />
                ) : (
                  <View style={styles.previewImagePlaceholder}>
                    <Ionicons name="image-outline" size={20} color={theme.textMuted} />
                  </View>
                )}
                <View style={styles.previewInfo}>
                  <Text style={styles.previewTitle} numberOfLines={1}>{req.sellerProduct.title}</Text>
                  <Text style={styles.previewPrice}>LKR {formatPrice(req.sellerProduct.price)}</Text>
                </View>
              </>
            ) : (
              <>
                {req.buyerProduct.imagesUrls?.[0] ? (
                  <Image source={{ uri: req.buyerProduct.imagesUrls[0] }} style={styles.previewImage} />
                ) : (
                  <View style={styles.previewImagePlaceholder}>
                    <Ionicons name="image-outline" size={20} color={theme.textMuted} />
                  </View>
                )}
                <View style={styles.previewInfo}>
                  <Text style={styles.previewTitle} numberOfLines={1}>{req.buyerProduct.title}</Text>
                  <Text style={styles.previewPrice}>LKR {formatPrice(req.buyerProduct.price)}</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Ionicons name="swap-horizontal" size={20} color={theme.success} style={styles.swapIcon} />

        <View style={styles.swapProduct}>
          <Text style={styles.swapProductLabel}>
            {req.buyerId === user.uid ? "You Gave" : "You Received"}
          </Text>
          <TouchableOpacity
            style={styles.productPreview}
            onPress={() => navigation.navigate("ProductDetails", { product: req.buyerId === user.uid ? req.buyerProduct : req.sellerProduct })}
          >
            {req.buyerId === user.uid ? (
              <>
                {req.buyerProduct.imagesUrls?.[0] ? (
                  <Image source={{ uri: req.buyerProduct.imagesUrls[0] }} style={styles.previewImage} />
                ) : (
                  <View style={styles.previewImagePlaceholder}>
                    <Ionicons name="image-outline" size={20} color={theme.textMuted} />
                  </View>
                )}
                <View style={styles.previewInfo}>
                  <Text style={styles.previewTitle} numberOfLines={1}>{req.buyerProduct.title}</Text>
                  <Text style={styles.previewPrice}>LKR {formatPrice(req.buyerProduct.price)}</Text>
                </View>
              </>
            ) : (
              <>
                {req.sellerProduct.imagesUrls?.[0] ? (
                  <Image source={{ uri: req.sellerProduct.imagesUrls[0] }} style={styles.previewImage} />
                ) : (
                  <View style={styles.previewImagePlaceholder}>
                    <Ionicons name="image-outline" size={20} color={theme.textMuted} />
                  </View>
                )}
                <View style={styles.previewInfo}>
                  <Text style={styles.previewTitle} numberOfLines={1}>{req.sellerProduct.title}</Text>
                  <Text style={styles.previewPrice}>LKR {formatPrice(req.sellerProduct.price)}</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const fetchBuyRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products/buy-requests`);
      const allProducts = res.data || [];

      const requests = [];

      allProducts.forEach((product) => {
        if (!product.buyRequests?.length) return;

        product.buyRequests.forEach((req) => {
          requests.push({
            _id: req._id,
            status: req.status,
            buyerId: req.buyerId,
            buyerName: req.buyerName,
            buyerContact: req.buyerContact,
            sellerId: req.sellerId,
            sellerName: req.sellerName,
            sellerContact: req.sellerContact,
            product,
          });
        });
      });

      const statusOrder = { pending: 1, accepted: 2, rejected: 3, cancelled: 4 };
      requests.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

      const currentUserDbId = user.dbId || user.uid;
      const filtered = requests.filter(
        r => r.sellerId === String(user.uid).trim() || r.buyerId === String(currentUserDbId).trim()
      );

      setBuyRequests(filtered);

    } catch (err) {
      console.log("Error fetching buy requests:", err.response?.data || err.message);
      setBuyRequests([]);
    }
  };

  const StatBox = ({ count, label, onPress, icon }) => (
    <TouchableOpacity style={styles.statBox} onPress={onPress}>
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={20} color={theme.primary} />
      </View>
      <Text style={styles.statNumber}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>Manage your products and requests</Text>
      </View>

      {/* Add Product Button */}
      <TouchableOpacity
        style={styles.addProductBtn}
        onPress={() => navigation.navigate("MainTabs", { screen: "AddProduct" })}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.addProductText}>Add New Product</Text>
      </TouchableOpacity>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <StatBox 
          count={availableCount} 
          label="Available" 
          onPress={() => scrollToSection("available")}
          icon="checkmark-circle-outline"
        />
        <StatBox 
          count={soldCount} 
          label="Sold" 
          onPress={() => scrollToSection("sold")}
          icon="cart-outline"
        />
        <StatBox 
          count={swappedCount} 
          label="Swapped" 
          onPress={() => scrollToSection("swapped")}
          icon="swap-horizontal-outline"
        />
        <StatBox 
          count={pendingRequestsCount} 
          label="Swap Reqest" 
          onPress={() => scrollToSection("requests")}
          icon="sync-outline"
        />
        <StatBox 
          count={buyRequestsCount} 
          label="Buy Reqest" 
          onPress={() => scrollToSection("buyRequests")}
          icon="cash-outline"
        />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Available Products */}
        <View onLayout={(e) => handleLayout("available", e)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            <Text style={styles.sectionTitle}>Available Products</Text>
          </View>
          <View style={styles.itemsContainer}>
            {myProducts.filter((p) => p.status === "available").length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={48} color={theme.border} />
                <Text style={styles.emptyText}>No available products</Text>
              </View>
            ) : (
              <ExpandableList 
                items={myProducts.filter((p) => p.status === "available")}
                renderItem={renderProductCard}
              />
            )}
          </View>
        </View>

        {/* Sold Products */}
        <View onLayout={(e) => handleLayout("sold", e)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cart" size={20} color={theme.accent} />
            <Text style={styles.sectionTitle}>Sold Products</Text>
          </View>
          <View style={styles.itemsContainer}>
            {myProducts.filter((p) => p.status === "sold").length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={theme.border} />
                <Text style={styles.emptyText}>No sold products</Text>
              </View>
            ) : (
              <ExpandableList 
                items={myProducts.filter((p) => p.status === "sold")}
                renderItem={renderSoldProductCard}
              />
            )}
          </View>
        </View>

        {/* Swap Products */}
        <View onLayout={(e) => handleLayout("swapped", e)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sync" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>Swap Products</Text>
          </View>
          <View style={styles.itemsContainer}>
            {swapRequests.filter(req => req.status === "accepted").length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="git-compare-outline" size={48} color={theme.border} />
                <Text style={styles.emptyText}>No swap history yet</Text>
              </View>
            ) : (
              <ExpandableList 
                items={swapRequests.filter(req => req.status === "accepted")}
                renderItem={renderCompletedSwapCard}
              />
            )}
          </View>
        </View>

        {/* Swap Requests */}
        <View onLayout={(e) => handleLayout("requests", e)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sync" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>Swap Requests</Text>
          </View>
          <View style={styles.itemsContainer}>
            {swapRequests.filter((req) => req.status !== "accepted").length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="git-compare-outline" size={48} color={theme.border} />
                <Text style={styles.emptyText}>No swap requests yet</Text>
              </View>
            ) : (
              <ExpandableList 
                items={swapRequests.filter((req) => req.status !== "accepted")}
                renderItem={renderSwapRequestCard}
              />
            )}
          </View>
        </View>

        {/* Buy Requests */}
        <View onLayout={(e) => handleLayout("buyRequests", e)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash" size={20} color={theme.success} />
            <Text style={styles.sectionTitle}>Buy Requests</Text>
          </View>
          <ProductOwnerBuyerRequest
            requests={buyRequests}
            user={user}
            onRefresh={onRefresh}
          />
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// Enhanced Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  addProductBtn: {
    backgroundColor: theme.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 16,
    elevation: 4,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addProductText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.card,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: "500",
    textAlign:"center",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.textPrimary,
    marginLeft: 8,
  },
  itemsContainer: {
    paddingHorizontal: 20,
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
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: theme.borderLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 8,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  cardImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: theme.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.accent,
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  metaText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginLeft: 4,
  },
  swapCard: {
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
  swapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  swapTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  swapProducts: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  swapProduct: {
    flex: 1,
  },
  swapProductLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.textSecondary,
    marginBottom: 8,
  },
  productPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 8,
  },
  previewImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  previewImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: theme.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  previewInfo: {
    flex: 1,
    marginLeft: 8,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.textPrimary,
    marginBottom: 2,
  },
  previewPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.accent,
  },
  swapIcon: {
    marginHorizontal: 12,
  },
  requestNote: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 12,
    textAlign: "center",
  },
  swapActions: {
    marginTop: 8,
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
    paddingVertical: 10,
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
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.dangerLight,
    gap: 6,
  },
  cancelButtonText: {
    color: theme.danger,
    fontWeight: "600",
    fontSize: 14,
  },
  soldCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  soldProductSection: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  soldProductImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  soldProductImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: theme.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  soldProductInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  soldProductTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 4,
  },
  soldProductPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.accent,
    marginBottom: 6,
  },
  soldProductMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  buyerSection: {
    padding: 16,
  },
  buyerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  buyerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
    marginLeft: 8,
  },
  buyerDetails: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 12,
  },
  buyerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  buyerLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.textSecondary,
    marginLeft: 6,
    marginRight: 8,
    width: 70,
  },
  buyerValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textPrimary,
    flex: 1,
  },
  noBuyerInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.warningLight,
    borderRadius: 12,
    padding: 12,
  },
  noBuyerText: {
    fontSize: 14,
    color: theme.warning,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  buyerFromRequest: {
    marginBottom: 12,
  },
  requestStatus: {
    marginTop: 8,
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