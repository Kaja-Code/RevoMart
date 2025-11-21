import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
  Animated,
  ScrollView
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';

export default function AdminProductsScreen({ navigation }) {
  const { user } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fadeAnim = useState(new Animated.Value(0))[0];

  const fetchProducts = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      let url = `${API_URL}/api/admin/products?page=${pageNum}&limit=20`;
      if (filter !== 'all') url += `&status=${filter}`;
      if (search) url += `&search=${search}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        if (reset || pageNum === 1) {
          setProducts(data.products);
        } else {
          setProducts(prev => [...prev, ...data.products]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
        setPage(pageNum);
        
        // Animate content in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const updateProductStatus = async (productId, status) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/admin/products/${productId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setProducts(prev => prev.map(product => 
          product._id === productId ? { ...product, status } : product
        ));
        Alert.alert('Success', `Product marked as ${status}`);
      }
    } catch (error) {
      console.error('Error updating product status:', error);
      Alert.alert('Error', 'Failed to update product status');
    }
  };

  const deleteProduct = async (productId) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await user.getIdToken();
              const response = await fetch(`${API_URL}/api/admin/products/${productId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                setProducts(prev => prev.filter(product => product._id !== productId));
                Alert.alert('Success', 'Product deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete product');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(1, true).finally(() => setRefreshing(false));
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchProducts(page + 1);
    }
  };

  useEffect(() => {
    fetchProducts(1, true);
  }, [filter]);

  const handleSearch = () => {
    fetchProducts(1, true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'sold': return '#2196F3';
      case 'swapped': return '#FF9800';
      case 'removed': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return 'check-circle';
      case 'sold': return 'currency-usd';
      case 'swapped': return 'swap-horizontal';
      case 'removed': return 'archive';
      default: return 'help-circle';
    }
  };

  const renderProductItem = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.productItem,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        }
      ]}
    >
      <Image
        source={{ uri: item.imagesUrls?.[0] }}
        style={styles.productImage}
        defaultSource={require('../../../assets/welcome.png')}
      />
      
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' }
          ]}>
            <MaterialCommunityIcons 
              name={getStatusIcon(item.status)} 
              size={14} 
              color={getStatusColor(item.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.productPrice}>LKR {item.price?.toLocaleString()}</Text>
        
        <View style={styles.productMeta}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="account" size={12} color="#666" />
            <Text style={styles.metaText}>{item.ownerId?.username || 'Unknown'}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="calendar" size={12} color="#666" />
            <Text style={styles.metaText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Text style={styles.productCondition} numberOfLines={1}>
          Condition: {item.condition || 'N/A'}
        </Text>
      </View>

      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.statusButton}
          onPress={() => {
            const statuses = [
              { label: 'Available', value: 'available', icon: 'check-circle', color: '#4CAF50' },
              { label: 'Sold', value: 'sold', icon: 'currency-usd', color: '#2196F3' },
              { label: 'Swapped', value: 'swapped', icon: 'swap-horizontal', color: '#FF9800' },
              { label: 'Removed', value: 'removed', icon: 'archive', color: '#F44336' },
            ];
            
            Alert.alert(
              'Update Status',
              `Change status for "${item.title}"?`,
              statuses.map(({ label, value, icon, color }) => ({
                text: label,
                onPress: () => updateProductStatus(item._id, value)
              }))
            );
          }}
        >
          <MaterialCommunityIcons name="pencil" size={18} color="#2F6F61" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}
          onPress={() => deleteProduct(item._id)}
        >
          <MaterialCommunityIcons name="delete-outline" size={18} color="#f44336" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => setSelectedProduct(selectedProduct === item._id ? null : item._id)}
        >
          <MaterialCommunityIcons name="dots-vertical" size={18} color="#666" />
        </TouchableOpacity>

        {selectedProduct === item._id && (
          <View style={styles.actionMenu}>
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={() => {
                navigation.navigate('ProductDetails', { product: item });
                setSelectedProduct(null);
              }}
            >
              <MaterialCommunityIcons name="eye" size={16} color="#666" />
              <Text style={styles.actionMenuText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={() => {
                // Edit product functionality
                setSelectedProduct(null);
              }}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#2F6F61" />
              <Text style={styles.actionMenuText}>Edit Product</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderFooter = () => {
    if (!hasMore && products.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>No more products to load</Text>
        </View>
      );
    }
    
    if (loading && products.length > 0) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#2F6F61" />
          <Text style={styles.footerText}>Loading more products...</Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header with glass effect */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#2F6F61" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Product Management</Text>
            <Text style={styles.headerSubtitle}>{products.length} products found</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="filter-variant" size={24} color="#2F6F61" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#2F6F61" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products by title..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {[
            { key: 'all', label: 'All Products', icon: 'package-variant' },
            { key: 'available', label: 'Available', icon: 'check-circle' },
            { key: 'sold', label: 'Sold', icon: 'currency-usd' },
            { key: 'swapped', label: 'Swapped', icon: 'swap-horizontal' },
            { key: 'removed', label: 'Removed', icon: 'archive' },
          ].map((filterItem) => (
            <TouchableOpacity
              key={filterItem.key}
              style={[
                styles.filterButton,
                filter === filterItem.key && styles.activeFilter
              ]}
              onPress={() => setFilter(filterItem.key)}
            >
              <MaterialCommunityIcons 
                name={filterItem.icon} 
                size={16} 
                color={filter === filterItem.key ? "#FFF" : "#2F6F61"} 
              />
              <Text style={[
                styles.filterText,
                filter === filterItem.key && styles.activeFilterText
              ]}>
                {filterItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        renderItem={renderProductItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#2F6F61']}
            tintColor="#2F6F61"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant-closed" size={80} color="#E1EDE7" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>
              {search || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'No products available yet'
              }
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {loading && products.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2F6F61" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 10,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerText: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2F6F61',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  backButton: {
    padding: 8,
  },
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 20,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225, 237, 231, 0.5)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2F2F2F',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225, 237, 231, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  activeFilter: {
    backgroundColor: '#2F6F61',
    borderColor: '#2F6F61',
  },
  filterText: {
    fontSize: 14,
    color: '#2F6F61',
    fontWeight: '500',
    marginLeft: 6,
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  productItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 16,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#E1EDE7',
  },
  productInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F2F2F',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2F6F61',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  productCondition: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  productActions: {
    alignItems: 'center',
    position: 'relative',
  },
  statusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(47, 111, 97, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moreButton: {
    padding: 4,
  },
  actionMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    minWidth: 140,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionMenuText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2F6F61',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.9)',
  },
  loadingText: {
    fontSize: 16,
    color: '#2F6F61',
    marginTop: 12,
  },
});