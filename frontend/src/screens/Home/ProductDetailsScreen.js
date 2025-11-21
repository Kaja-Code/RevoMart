// frontend/src/screens/Home/ProductDetailsScreen.js
import React , {useState} from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";
 import SellerProfileScreen from "./SellerProfileScreen";

const { width } = Dimensions.get("window");

// Enhanced theme colors
const theme = {
  primary: "#2563EB",     // blue
  accent: "#DC2626",      // red
  secondary: "#059669",   // green
  background: "#F8FAFC",  // light blue-gray
  surface: "#FFFFFF",     // white
  muted: "#64748B",       // slate
  border: "#E2E8F0",      // light border
  success: "#10B981",     // emerald
  warning: "#F59E0B",     // amber
  textPrimary: "#0F172A", // dark text
  textSecondary: "#475569", // secondary text
};

export default function ProductDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [product, setProduct] = React.useState(route.params?.product || {});
  const [loading, setLoading] = React.useState(true);

  const [showProfile, setShowProfile] = useState(false);

  // Fetch fresh product data on mount - KEEPING ALL LOGIC SAME
  React.useEffect(() => {
    if (!product?._id) return;

    const fetchProduct = async () => {
      setLoading(true);

      try {
        const token = await user.getIdToken();

        // Increment views first
        try {
          const viewRes = await fetch(`${API_URL}/api/products/${product._id}/view`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });

          if (viewRes.ok) {
            setProduct(prev => ({
              ...prev,
              viewsCount: (prev.viewsCount || 0) + 1,
            }));
          }
        } catch (err) {
          console.error("Error incrementing view:", err);
        }

        // Fetch latest product details
        const res = await fetch(`${API_URL}/api/products/${product._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setProduct(data);
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [product._id, user]);

  // Derived state: check if user already requested to buy - KEEPING ALL LOGIC SAME
  const hasRequested = React.useMemo(() => {
    return product.buyRequests?.some(
      r => (r.buyerId === user?.uid || r.buyerId?._id === user?.uid) && r.status === "pending"
    );
  }, [product.buyRequests, user?.uid]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="image-off-outline" size={80} color={theme.muted} />
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  const formatPrice = (price) => {
    if (!price) return "N/A";
    return Number(price).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ALL FUNCTIONS REMAIN EXACTLY THE SAME
  const handleStartChat = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/messages/conversations/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: product.ownerId._id,
          productId: product._id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        navigation.navigate("Chat", {
          conversation: data.conversation,
          otherUser: data.conversation.otherUser,
        });
      } else {
        Alert.alert("Error", data.error || "Failed to start conversation");
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      Alert.alert("Error", "Failed to start conversation");
    }
  };

  const handleWhatsApp = () => {
    if (product.ownerContact) {
      const message = `Hi! I'm interested in your product: ${product.title} - LKR ${formatPrice(
        product.price
      )}`;
      const whatsappUrl = `whatsapp://send?phone=${product.ownerContact}&text=${encodeURIComponent(
        message
      )}`;

      Linking.canOpenURL(whatsappUrl).then((supported) => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          Alert.alert("WhatsApp not installed", "Please install WhatsApp to use this feature");
        }
      });
    } else {
      Alert.alert("Contact not available", "Seller contact information is not available");
    }
  };

  const handleBuy = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/products/${product._id}/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Buy request sent successfully");

        // Use backend response for accurate buyerId
        const newRequest = data.product.buyRequests.at(-1);

        setProduct(prev => ({
          ...prev,
          buyRequests: [...(prev.buyRequests || []), newRequest]
        }));
      } else {
        Alert.alert("Error", data.error || "Failed to send buy request");
      }
    } catch (error) {
      console.error("Buy request error:", error);
      Alert.alert("Error", "Something went wrong");
    }
  };

  const handleCall = () => {
    if (product.ownerContact) {
      const phoneUrl = `tel:${product.ownerContact}`;

      Linking.canOpenURL(phoneUrl).then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert("Cannot make call", "Your device does not support making calls");
        }
      });
    } else {
      Alert.alert("Contact not available", "Seller contact information is not available");
    }
  };

  const isOwner = product?.ownerId?.firebaseUid === user?.uid;
  const canEditOrBuySwap = product.status === "available";

  // Get status badge color based on status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return theme.success;
      case 'sold':
        return theme.accent;
      case 'pending':
        return theme.warning;
      case 'reserved':
        return theme.primary;
      default:
        return theme.muted;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Section with Consistent Height */}
        <View style={styles.imageSection}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
          >
            {product.imagesUrls?.length > 0 ? (
              product.imagesUrls.map((img, idx) => (
                <View key={idx} style={styles.imageContainer}>
                  <Image 
                    source={{ uri: img }} 
                    style={styles.image}
                    resizeMode="contain"
                  />
                </View>
              ))
            ) : (
              <View style={styles.noImage}>
                <MaterialCommunityIcons name="image-multiple-outline" size={80} color={theme.muted} />
                <Text style={styles.noImageText}>No Images Available</Text>
              </View>
            )}
          </ScrollView>
          {product.imagesUrls?.length > 1 && (
            <View style={styles.imageIndicator}>
              <MaterialCommunityIcons name="image-multiple" size={14} color="#fff" />
              <Text style={styles.imageIndicatorText}>
                1/{product.imagesUrls.length}
              </Text>
            </View>
          )}
        </View>

        {/* Product Info Section */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>LKR {formatPrice(product.price)}</Text>
            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product.status) }]}>
                <Text style={styles.statusBadgeText}>
                  {product.status?.toUpperCase() || 'UNKNOWN'}
                </Text>
              </View>
              {product.isForSwap && (
                <View style={styles.swapTag}>
                  <MaterialCommunityIcons name="swap-horizontal" size={14} color="#fff" />
                  <Text style={styles.swapTagText}>Swap Available</Text>
                </View>
              )}
            </View>
          </View>
          
          <Text style={styles.title}>{product.title}</Text>
          
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="tag-outline" size={16} color={theme.primary} />
              <Text style={styles.metaText}>Condition: {product.condition}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="eye-outline" size={16} color={theme.primary} />
              <Text style={styles.metaText}>{product.viewsCount || 0} views</Text>
            </View>
          </View>

          <View style={styles.descriptionBox}>
            <View style={styles.descriptionHeader}>
              <MaterialCommunityIcons name="text-box-outline" size={18} color={theme.primary} />
              <Text style={styles.descriptionLabel}>Description</Text>
            </View>
            <Text style={styles.description}>
              {product.description || "No description available"}
            </Text>
          </View>
        </View>

        {/* Product Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information-outline" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>Product Details</Text>
          </View>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailColumn}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="account-outline" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Owner</Text>
                  {/* <Text style={styles.detailValue}>{product.ownerName || "N/A"}</Text> */}

                  {/* Seller Profile  */}
                  <TouchableOpacity
  onPress={() => {
    if (product.ownerId.firebaseUid === user.uid) {
      Alert.alert("Access Denied", "You can't review your own product.");
    } else {
      setShowProfile(true);
    }
  }}
>
  <Text style={[styles.detailValue, { color: "blue" }]}>
    {product.ownerName || "N/A"}
  </Text>
</TouchableOpacity>

{/* Popup Modal */}
<Modal visible={showProfile} transparent animationType="slide">
  <SellerProfileScreen
    ownerId={product.ownerId.firebaseUid}
    onClose={() => setShowProfile(false)}
  />
</Modal>

                </View>
              </View>

              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="folder-outline" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{product.categoryName || "N/A"}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="eye-outline" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Views</Text>
                  <Text style={styles.detailValue}>{product.viewsCount || 0}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailColumn}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="phone-outline" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Contact</Text>
                  <Text style={styles.detailValue}>{product.ownerContact || "N/A"}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{product.address || "N/A"}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="calendar-outline" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Listed Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(product.listedDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {product.swapPreferences && (
            <View style={styles.swapSection}>
              <View style={styles.swapHeader}>
                <MaterialCommunityIcons name="swap-horizontal" size={18} color={theme.secondary} />
                <Text style={styles.swapTitle}>Swap Preferences</Text>
              </View>
              <Text style={styles.swapPreferences}>{product.swapPreferences}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {canEditOrBuySwap && !isOwner && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="shopping-outline" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>Interested in this item?</Text>
            </View>
            
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.buyBtn, hasRequested && styles.disabledBtn]}
                onPress={!hasRequested ? handleBuy : null}
                disabled={hasRequested}
              >
                <MaterialCommunityIcons 
                  name={hasRequested ? "check-circle" : "cart"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.buyBtnText}>
                  {hasRequested ? "Request Sent" : "Buy Now"}
                </Text>
              </TouchableOpacity>

              {product.isForSwap && (
                <TouchableOpacity
                  style={styles.swapBtn}
                  onPress={() => navigation.navigate("Swap", { product })}
                >
                  <MaterialCommunityIcons name="swap-horizontal" size={20} color="#fff" />
                  <Text style={styles.swapBtnText}>Swap Item</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Contact Seller Section */}
        {!isOwner && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="message-text-outline" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>Contact Seller</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Get in touch with the seller directly</Text>
            
            <View style={styles.contactRow}>
              <TouchableOpacity style={styles.contactBtn} onPress={handleStartChat}>
                <View style={[styles.contactIcon, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialCommunityIcons name="message-text" size={24} color={theme.primary} />
                </View>
                <Text style={styles.contactBtnText}>Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactBtn} onPress={handleWhatsApp}>
                <View style={[styles.contactIcon, { backgroundColor: '#F0FDF4' }]}>
                  <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
                </View>
                <Text style={styles.contactBtnText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactBtn} onPress={handleCall}>
                <View style={[styles.contactIcon, { backgroundColor: '#FEF2F2' }]}>
                  <MaterialCommunityIcons name="phone" size={24} color={theme.accent} />
                </View>
                <Text style={styles.contactBtnText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Owner Section - Only show edit/delete buttons when status is "available" */}
        {isOwner && product.status === "available" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="shield-account" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>Manage Your Product</Text>
            </View>
            
            <View style={styles.ownerActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => Alert.alert("Edit Product", "You can't Edit your product Now")}
              >
                <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
                <Text style={styles.editBtnText}>Edit Product</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  Alert.alert("Delete Product", "Are you sure you want to delete this product? This action cannot be undone.", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          const token = await user.getIdToken();
                          const response = await fetch(`${API_URL}/api/products/${product._id}`, {
                            method: "DELETE",
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          });

                          if (response.ok) {
                            Alert.alert("Deleted", "Product deleted successfully");
                            navigation.goBack();
                          } else {
                            const data = await response.json();
                            Alert.alert("Error", data.error || "Failed to delete product");
                          }
                        } catch (err) {
                          console.error("Delete error:", err);
                          Alert.alert("Error", "Something went wrong");
                        }
                      },
                    },
                  ]);
                }}
              >
                <MaterialCommunityIcons name="delete-outline" size={18} color="#fff" />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Owner Info for non-available products */}
        {isOwner && product.status !== "available" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="information-outline" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>Product Status</Text>
            </View>
            <View style={styles.statusMessage}>
              <MaterialCommunityIcons 
                name={
                  product.status === "sold" ? "check-circle" : 
                  product.status === "pending" ? "clock" : "alert-circle"
                } 
                size={24} 
                color={getStatusColor(product.status)} 
              />
              <Text style={styles.statusMessageText}>
                This product is currently <Text style={{ fontWeight: 'bold' }}>{product.status}</Text>. 
                {product.status === "sold" && " It can no longer be edited or deleted."}
                {product.status === "pending" && " Edit and delete options are disabled while there are pending requests."}
              </Text>
            </View>
          </View>
        )}

        {/* Safe area spacer */}
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.muted,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background,
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 18,
    color: theme.muted,
    fontWeight: '600',
  },
  imageSection: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    height: 320, // Consistent height for all products
  },
  imageContainer: {
    width,
    height: 320, // Fixed height for consistent display
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingBottom: 10,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: "contain", // Show full image without cropping
  },
  noImage: {
    width,
    height: 320,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#F8FAFC',
  },
  noImageText: {
    marginTop: 12,
    color: theme.muted,
    fontSize: 16,
    fontWeight: '500',
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  imageIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.accent,
    flex: 1,
  },
  statusBadgeContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  swapTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  swapTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 12,
    lineHeight: 26,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  description: {
    fontSize: 15,
    color: theme.textSecondary,
    lineHeight: 22,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  detailColumn: {
    flex: 1,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: theme.muted,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: theme.textPrimary,
    fontWeight: '600',
  },
  swapSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  swapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  swapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  swapPreferences: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
    backgroundColor: '#F0FDF9',
    padding: 12,
    borderRadius: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.muted,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.accent,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  disabledBtn: {
    backgroundColor: theme.muted,
  },
  buyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  swapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.secondary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  swapBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  contactBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactBtnText: {
    fontSize: 13,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  statusMessageText: {
    flex: 1,
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  spacer: {
    height: 20,
  },
});