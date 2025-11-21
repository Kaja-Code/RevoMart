// frontend/src/screens/SwapScreen.jsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SectionList,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";

// Theme
const theme = {
  primary: "#2F6F61",   // deep muted green
  accent: "#FF6F61",    // coral
  background: "#F9FAFB",
  card: "#FFFFFF",
  border: "#E5E7EB",
  muted: "#6B7280",
  success: "#4CAF50",
};

export default function SwapScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { product } = route.params || {}; // Seller's product
  const { user } = useAuth();

  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch buyer's products
  useEffect(() => {
    const fetchMyProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products`);
        const data = await res.json();

        if (res.ok) {
          const mine = (data || []).filter(
            (p) => p.ownerId?.firebaseUid === user?.uid
          );
          const available = mine.filter(
            (p) => p.status?.toLowerCase() === "available"
          );
          const matching = available.filter(
            (p) => Number(p.price) === Number(product.price)
          );
          setMyProducts(matching);
        } else {
          Alert.alert("Error", data.error || "Failed to fetch products");
        }
      } catch (err) {
        console.error("Error fetching swap products:", err);
        Alert.alert("Error", "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchMyProducts();
  }, []);

  const handleConfirmSwap = async () => {
    if (!selectedProduct) {
      return Alert.alert(
        "Select Product",
        "Please select one of your products for swap."
      );
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/products/${product._id}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          buyerId: user.uid,
          buyerProductId: selectedProduct._id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert("✅ Success", "Swap request sent to seller!");
        navigation.goBack();
      } else {
        Alert.alert("Error", data.error || "Failed to send swap request");
      }
    } catch (err) {
      console.error("Swap error:", err);
      Alert.alert("Error", "Something went wrong");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Group by category
  const sections = myProducts.reduce((acc, item) => {
    const category = item.category || "Other";
    const existing = acc.find((s) => s.title === category);
    if (existing) {
      existing.data.push(item);
    } else {
      acc.push({ title: category, data: [item] });
    }
    return acc;
  }, []);

  return (
    <View style={styles.container}>
      {/* Seller’s Product */}
      <View style={styles.sellerProduct}>
        <Text style={styles.sectionTitle}>Product You Want</Text>
        <Image source={{ uri: product.imagesUrls?.[0] }} style={styles.image} />
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>
          LKR {Number(product.price).toLocaleString()}
        </Text>
      </View>

      {/* Your Products */}
      <Text style={styles.sectionTitle}>Select One of Your Products</Text>

      {myProducts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noProductText}>
            No products with matching price available for swap.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.categoryHeader}>{title}</Text>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.productCard,
                selectedProduct?._id === item._id && styles.selectedCard,
              ]}
              onPress={() => setSelectedProduct(item)}
            >
              <Image
                source={{ uri: item.imagesUrls?.[0] }}
                style={styles.imageSmall}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.productTitle}>{item.title}</Text>
                <Text style={styles.priceSmall}>
                  LKR {Number(item.price).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Confirm Button */}
      {myProducts.length > 0 && (
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmSwap}>
          <Text style={styles.confirmBtnText}>Confirm Swap</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: theme.background },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 10,
    color: theme.accent,
  },
  sellerProduct: {
    alignItems: "center",
    marginBottom: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.card,
    elevation: 2,
  },
  image: { width: 200, height: 200, borderRadius: 12 },
  imageSmall: { width: 80, height: 80, borderRadius: 10 },
  title: { fontSize: 18, fontWeight: "700", marginTop: 8, color: "#111827" },
  productTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  price: { fontSize: 16, color: theme.accent, fontWeight: "600" },
  priceSmall: { fontSize: 14, color: theme.muted },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    backgroundColor: theme.card,
    elevation: 1,
  },
  selectedCard: { borderColor: theme.success, backgroundColor: "#E8F5E9" },
  categoryHeader: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 15,
    marginBottom: 6,
    color: theme.primary,
  },
  confirmBtn: {
    backgroundColor: theme.success,
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
  },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  noProductText: { fontSize: 15, color: theme.muted, marginTop: 20 },
});
