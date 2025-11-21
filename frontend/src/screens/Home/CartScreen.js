import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { API_URL } from "../../constants/config";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  const fetchFavorites = useCallback(async () => {
    if (!user) return setFavorites([]);

    try {
      setLoading(true);
      const token = await user.getIdToken(true);
      const res = await axios.get(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites(res.data.favorites || []);
    } catch (e) {
      console.log("Error fetching favorites:", e.response?.data || e.message);
      Alert.alert("Error", e.response?.data?.error || "Could not fetch favorites");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const removeFromFavorites = async (favId) => {
    if (!user) return;
    try {
      const token = await user.getIdToken(true);
      await axios.delete(`${API_URL}/api/favorites/${favId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites((prev) => prev.filter((f) => f._id !== favId));
      Alert.alert("Success", "Removed from favorites!");
    } catch (e) {
      console.log("Error removing favorite:", e.response?.data || e.message);
      Alert.alert("Error", e.response?.data?.error || "Could not remove favorite");
    }
  };

  const onRefresh = useCallback(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Favorites</Text>

      {favorites.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="heart-outline" size={64} color="#ADB5BD" />
          <Text style={styles.emptyText}>No favorites yet</Text>
          <Text style={styles.emptySubText}>Start exploring and add products you like</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("ProductDetails", { product: item.productId })}
            >
              <Image
                source={{ uri: item.productId?.imagesUrls?.[0] }}
                style={styles.image}
              />
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.productId?.title}
                </Text>
                <Text style={styles.price}>LKR {item.productId?.price}</Text>
              </View>
              <TouchableOpacity
                onPress={() => removeFromFavorites(item._id)}
                style={styles.removeBtn}
              >
                <MaterialCommunityIcons name="delete-outline" size={24} color="#C0392B" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F8F9FA" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16, color: "#2F2F2F" },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#6C757D", marginTop: 10 },
  emptySubText: { fontSize: 14, color: "#ADB5BD", marginTop: 4 },

  // Card style
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#E1EDE7",
  },
  info: { flex: 1, justifyContent: "center" },
  name: { fontSize: 16, fontWeight: "600", color: "#2F2F2F" },
  price: { fontSize: 14, color: "#2F6F61", fontWeight: "700", marginTop: 2 },

  removeBtn: {
    backgroundColor: "#FDECEA",
    padding: 8,
    borderRadius: 8,
  },
});
