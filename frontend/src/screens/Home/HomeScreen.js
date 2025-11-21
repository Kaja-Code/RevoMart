// HomeScreen.js (Fixed Quick Filters UI Alignment)
import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import axios from "axios";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";
import Layout from "../../components/Layouts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dropdown } from "react-native-element-dropdown";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useEffect } from "react";
import FeedbackPopup from "../Feedback/FeedbackPopup";


// Location list
const LOCATIONS = [
  "All","Ampara","Anuradhapura","Badulla","Batticaloa","Colombo","Galle","Gampaha",
  "Hambantota","Jaffna","Kalutara","Kandy","Kegalle","Kilinochchi","Kurunegala",
  "Mannar","Matale","Matara","Monaragala","Mullaitivu","Nuwara Eliya","Polonnaruwa",
  "Puttalam","Ratnapura","Trincomalee","Vavuniya"
].map((loc) => ({ label: loc, value: loc === "All" ? "" : loc }));

// Price options
const PRICE_OPTIONS = [
  { label: "Any Price", value: null },
  { label: " 10,000", value: 10000 },
  { label: " 50,000", value: 50000 },
  { label: " 100,000", value: 100000 },
  { label: " 150,000", value: 150000 },
  { label: " 200,000", value: 200000 },
  { label: " 500,000", value: 500000 },
  { label: " 1M", value: 1000000 },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [location, setLocation] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Check if any filters are active
  const hasActiveFilters = search || minPrice || maxPrice || location;

  // Clear filters
  const clearFilters = () => {
    setSearch("");
    setMinPrice(null);
    setMaxPrice(null);
    setLocation("");
    setShowFilters(false);
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/categories`);
      setCategories(res.data || []);
    } catch (e) {
      console.log("Error fetching categories:", e.response?.data || e.message);
      setCategories([]);
    }
  };

  // Fetch products
  const fetchProducts = async (categoryId = "") => {
    try {
      const url = categoryId
        ? `${API_URL}/api/products?categoryId=${categoryId}`
        : `${API_URL}/api/products`;
      const res = await axios.get(url);
      setProducts(res.data || []);
    } catch (e) {
      console.log("Error fetching products:", e.response?.data || e.message);
      setProducts([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      fetchProducts();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(selectedCategory).finally(() => setRefreshing(false));
  }, [selectedCategory]);

  // Local filtering
  const filteredProducts = products.filter((p) => {
    const titleMatch = p.title?.toLowerCase().includes(search.toLowerCase());
    const minMatch = minPrice ? p.price >= minPrice : true;
    const maxMatch = maxPrice ? p.price <= maxPrice : true;
    const locationMatch = location
      ? p.address?.toLowerCase().includes(location.toLowerCase())
      : true;
    return titleMatch && minMatch && maxMatch && locationMatch;
  });

  const formatPrice = (price) =>
    price ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "N/A";

  // Favorites
  const handleAddToFavorites = async (productId) => {
    if (!user) return Alert.alert("Error", "Login first!");
    try {
      const token = await user.getIdToken(true);
      await axios.post(
        `${API_URL}/api/favorites`,
        { productId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Added to favorites!");
    } catch (err) {
      console.log("Error adding to favorites:", err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.error || "Failed to add to favorites");
    }
  };

  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);

  // Feedback popup logic
useEffect(() => {
  const checkFeedbackStatus = async () => {
    if (!user) return;

    const currentMonth = new Date().getMonth(); // 0–11
    const feedbackMonthKey = `feedback_last_submitted_month_${user.uid}`;
    const skipCountKey = `feedback_skip_count_${user.uid}`;

    const lastSubmittedMonth = await AsyncStorage.getItem(feedbackMonthKey);
    const skipCount = parseInt(await AsyncStorage.getItem(skipCountKey) || "0");

    // Show feedback popup if:
    // - user hasn't submitted this month
    // - and skipped less than 3 times
    if (parseInt(lastSubmittedMonth) !== currentMonth && skipCount < 3) {
      setShowFeedbackPopup(true);
    }
  };

  checkFeedbackStatus();
}, [user]);
const handleFeedbackClose = async () => {
  if (!user) return;
  const skipCountKey = `feedback_skip_count_${user.uid}`;
  const currentCount = parseInt(await AsyncStorage.getItem(skipCountKey) || "0");
  await AsyncStorage.setItem(skipCountKey, (currentCount + 1).toString());
  setShowFeedbackPopup(false);
};


  return (
    <Layout>
      <FeedbackPopup 
        visible={showFeedbackPopup} 
        onClose={handleFeedbackClose} 
      />

    <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#2F6F61"]}
            tintColor="#2F6F61"
          />
        }
        showsVerticalScrollIndicator={false}
      >
      {/* Search Bar with Filter Toggle Button */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            placeholder="Search secondhand goods..."
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity 
          onPress={() => setShowFilters(!showFilters)} 
          style={[styles.filterToggleBtn, hasActiveFilters && styles.activeFilterToggle]}
        >
          <MaterialCommunityIcons 
            name="filter-variant" 
            size={20} 
            color={hasActiveFilters ? "#fff" : "#2F6F61"} 
          />
          {hasActiveFilters && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>!</Text>
            </View>
          )}
        </TouchableOpacity>
        {hasActiveFilters && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearAllBtn}>
            <MaterialCommunityIcons name="filter-remove" size={20} color="#DC2626" />
            <Text style={styles.clearAllText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Filters - Hidden by Default, Show when Toggled */}
      {showFilters && (
        <View style={styles.quickFiltersSection}>
          <View style={styles.filtersHeader}>
            <Text style={styles.sectionTitle}>Quick Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.closeFiltersBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          {/* Price Range Section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            <View style={styles.priceRangeContainer}>
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Min Price</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons  size={16} color="#2F6F61" style={styles.dropdownIcon} />
                  <Dropdown
                    style={styles.dropdown}
                    data={PRICE_OPTIONS}
                    labelField="label"
                    valueField="value"
                    placeholder="Select min"
                    value={minPrice}
                    onChange={(item) => setMinPrice(item.value)}
                    placeholderStyle={{ color: "#6B7280", fontSize: 14 }}
                  />
                </View>
              </View>
              
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Max Price</Text>
                <View style={styles.dropdownContainer}>
                  <MaterialCommunityIcons size={16} color="#2F6F61" style={styles.dropdownIcon} />
                  <Dropdown
                    style={styles.dropdown}
                    data={PRICE_OPTIONS}
                    labelField="label"
                    valueField="value"
                    placeholder="Select max"
                    value={maxPrice}
                    onChange={(item) => setMaxPrice(item.value)}
                    placeholderStyle={{ color: "#6B7280", fontSize: 14 }}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Location</Text>
            <View style={styles.dropdownContainer}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#2F6F61" style={styles.dropdownIcon} />
              <Dropdown
                style={styles.dropdown}
                data={LOCATIONS}
                labelField="label"
                valueField="value"
                placeholder="Select location"
                value={location}
                onChange={(item) => setLocation(item.value)}
                placeholderStyle={{ color: "#6B7280", fontSize: 14 }}
              />
            </View>
          </View>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <View style={styles.activeFiltersSection}>
              <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
              <View style={styles.activeFiltersRow}>
                {minPrice && (
                  <View style={styles.activeFilterChip}>
                    <MaterialCommunityIcons name="currency-usd" size={14} color="#fff" />
                    <Text style={styles.activeFilterChipText}>Min: LKR {formatPrice(minPrice)}</Text>
                    <TouchableOpacity onPress={() => setMinPrice(null)} style={styles.removeFilterBtn}>
                      <MaterialCommunityIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                {maxPrice && (
                  <View style={styles.activeFilterChip}>
                    <MaterialCommunityIcons  size={14} color="#fff" />
                    <Text style={styles.activeFilterChipText}>Max: LKR {formatPrice(maxPrice)}</Text>
                    <TouchableOpacity onPress={() => setMaxPrice(null)} style={styles.removeFilterBtn}>
                      <MaterialCommunityIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                {location && (
                  <View style={styles.activeFilterChip}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#fff" />
                    <Text style={styles.activeFilterChipText}>{location}</Text>
                    <TouchableOpacity onPress={() => setLocation("")} style={styles.removeFilterBtn}>
                      <MaterialCommunityIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Add Product Button */}
      {/* <TouchableOpacity
        style={styles.addProductBtn}
        onPress={() => navigation.navigate("AddProduct")}
      >
        <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" />
        <Text style={styles.addProductText}>Sell Item</Text>
      </TouchableOpacity> */}

      
        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            <TouchableOpacity
              style={[styles.categoryBtn, selectedCategory === "" && styles.selectedCategory]}
              onPress={() => {
                setSelectedCategory("");
                fetchProducts();
              }}
            >
              <MaterialCommunityIcons 
                name="apps" 
                size={18} 
                color={selectedCategory === "" ? "#fff" : "#2F6F61"} 
              />
              <Text style={[styles.categoryText, selectedCategory === "" && styles.selectedCategoryText]}>
                All
              </Text>
            </TouchableOpacity>

            {categories?.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                style={[styles.categoryBtn, selectedCategory === cat._id && styles.selectedCategory]}
                onPress={() => {
                  setSelectedCategory(cat._id);
                  fetchProducts(cat._id);
                }}
              >
                <MaterialCommunityIcons 
                  name="tag-outline" 
                  size={16} 
                  color={selectedCategory === cat._id ? "#fff" : "#2F6F61"} 
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat._id && styles.selectedCategoryText,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products Grid */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory ? 'Selected Items' : 'All Items'} 
              <Text style={styles.productCount}> ({filteredProducts.length})</Text>
            </Text>
          </View>

          <View style={styles.itemsContainer}>
            {filteredProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="emoticon-sad-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No products found</Text>
                <Text style={styles.emptyStateSubtext}>Try adjusting your filters</Text>
                {hasActiveFilters && (
                  <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
                    <Text style={styles.clearFiltersText}>Clear All Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredProducts?.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.card}
                  onPress={() => navigation.navigate("ProductDetails", { product: item })}
                >
                  {/* Product Image */}
                  <View style={styles.imageContainer}>
                    {item.imagesUrls?.[0] ? (
                      <Image source={{ uri: item.imagesUrls[0] }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardImage, styles.placeholderImage]}>
                        <MaterialCommunityIcons name="image-off" size={32} color="#9CA3AF" />
                      </View>
                    )}
                    
                    {/* Favorite Button */}
                    {item.ownerId?.firebaseUid !== user?.uid && (
                      <TouchableOpacity 
                        style={styles.favoriteBtn}
                        onPress={() => handleAddToFavorites(item._id)}
                      >
                        <MaterialCommunityIcons name="heart-outline" size={18} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Product Info */}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.cardPrice}>LKR {formatPrice(item.price)}</Text>
                    
                    <View style={styles.productMeta}>
                      <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="checkbox-multiple-blank-circle" size={12} color="#6B7280" />
                        <Text style={styles.cardCondition}>{item.condition}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="map-marker-outline" size={12} color="#6B7280" />
                        <Text style={styles.cardLocation} numberOfLines={1}>
                          {item.address || "N/A"}
                        </Text>
                      </View>
                    </View>

                    {item.ownerId?.firebaseUid === user?.uid ? (
                      <View style={styles.ownerBadge}>
                        <MaterialCommunityIcons name="check-circle" size={14} color="#fff" />
                        <Text style={styles.ownerBadgeText}>Your Product</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.favoriteActionBtn}
                        onPress={() => handleAddToFavorites(item._id)}
                      >
                        <MaterialCommunityIcons name="heart" size={16} color="#fff" />
                        <Text style={styles.favoriteActionText}>Add to Favorites</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  // Search Section
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#374151",
  },
  filterToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F7F4",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1EDE7",
    position: "relative",
  },
  activeFilterToggle: {
    backgroundColor: "#2F6F61",
    borderColor: "#2F6F61",
  },
  filterBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#DC2626",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  clearAllText: {
    color: "#DC2626",
    fontWeight: "600",
    fontSize: 14,
  },

  // Quick Filters Section
  quickFiltersSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E1EDE7",
  },
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    paddingBottom:15,
  },
  closeFiltersBtn: {
    padding: 4,
  },

  // Filter Sections
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  priceRangeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 6,
    marginLeft: 4,
  },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 44,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  dropdown: {
    flex: 1,
    height: 42,
  },

  // Active Filters Section
  activeFiltersSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  activeFiltersTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  activeFiltersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2F6F61",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  activeFilterChipText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 12,
  },
  removeFilterBtn: {
    marginLeft: 2,
    padding: 2,
  },

  // Add Product Button
  addProductBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6F61",
    padding: 14,
    borderRadius: 25,
    marginBottom: 20,
    gap: 8,
    shadowColor: "#2F6F61",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addProductText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

  // Categories
  categoriesSection: {
    marginBottom: 24,
    
  },
  categoriesScroll: {
    marginBottom: 8,
  },
  categoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7F4",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E1EDE7",
  },
  categoryText: {
    color: "#2F6F61",
    fontWeight: "500",
    fontSize: 14,
  },
  selectedCategory: {
    backgroundColor: "#2F6F61",
    borderColor: "#2F6F61",
  },
  selectedCategoryText: {
    color: "#fff",
  },

  // Products Section
  productsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  productCount: {
    color: "#6B7280",
    fontWeight: "400",
  },
  itemsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  // Product Cards
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: 140,
  },
  placeholderImage: {
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    padding: 6,
  },
  cardInfo: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#1F2937",
    lineHeight: 18,
  },
  cardPrice: {
    fontSize: 15,
    color: "#2F6F61",
    fontWeight: "bold",
    marginBottom: 8,
  },
  productMeta: {
    gap: 4,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardCondition: {
    fontSize: 11,
    color: "#6B7280",
  },
  cardLocation: {
    fontSize: 11,
    color: "#6B7280",
    flex: 1,
  },
  favoriteActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6F61",
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  favoriteActionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  ownerBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6B7280",
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  ownerBadgeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    width: "100%",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  clearFiltersBtn: {
    marginTop: 12,
    backgroundColor: "#2F6F61",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearFiltersText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});