// frontend/src/screens/Admin/AdminUsersScreen.js - ENHANCED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Switch,
  RefreshControl,
  Animated,
  ActivityIndicator
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';

export default function AdminUsersScreen({ navigation }) {
  const { user } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  const fadeAnim = useState(new Animated.Value(0))[0];

  const fetchUsers = async (pageNum = 1, searchTerm = '', reset = false) => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      let url = `${API_URL}/api/admin/users?page=${pageNum}&limit=20`;
      if (searchTerm) url += `&search=${searchTerm}`;
      if (filter !== 'all') url += `&status=${filter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        if (reset || pageNum === 1) {
          setUsers(data.users);
        } else {
          setUsers(prev => [...prev, ...data.users]);
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
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId, isVerified) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isVerified })
      });

      const data = await response.json();
      if (response.ok) {
        setUsers(prev => prev.map(u => 
          u._id === userId ? { ...u, isVerified } : u
        ));
        Alert.alert('Success', `User ${isVerified ? 'verified' : 'unverified'} successfully`);
      } else {
        Alert.alert('Error', data.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const deleteUser = async (userId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await user.getIdToken();
              const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                setUsers(prev => prev.filter(u => u._id !== userId));
                Alert.alert('Success', 'User deleted successfully');
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Failed to delete user');
              }
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(1, search, true).finally(() => setRefreshing(false));
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchUsers(page + 1, search);
    }
  };

  useEffect(() => {
    fetchUsers(1, search, true);
  }, [filter]);

  const handleSearch = () => {
    fetchUsers(1, search, true);
  };

  const renderUserItem = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.userItem,
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
      <View style={styles.userAvatar}>
        <MaterialCommunityIcons 
          name="account-circle" 
          size={44} 
          color={item.isVerified ? "#2F6F61" : "#FF9500"} 
        />
      </View>

      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <View>
            <Text style={styles.userName}>{item.username}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.isVerified ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 149, 0, 0.1)' }
          ]}>
            <MaterialCommunityIcons 
              name={item.isVerified ? "check-circle" : "clock-alert"} 
              size={14} 
              color={item.isVerified ? "#4CAF50" : "#FF9500"} 
            />
            <Text style={[
              styles.statusText,
              { color: item.isVerified ? "#4CAF50" : "#FF9500" }
            ]}>
              {item.isVerified ? "Verified" : "Pending"}
            </Text>
          </View>
        </View>
        
        <View style={styles.userMeta}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="calendar" size={12} color="#666" />
            <Text style={styles.metaText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="heart" size={12} color="#666" />
            <Text style={styles.metaText}>
              {item.favoriteProducts?.length || 0} favorites
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="package-variant" size={12} color="#666" />
            <Text style={styles.metaText}>
              {item.products?.length || 0} products
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.userActions}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            value={item.isVerified}
            onValueChange={(value) => updateUserStatus(item._id, value)}
            trackColor={{ false: "#e0e0e0", true: "rgba(47, 111, 97, 0.5)" }}
            thumbColor={item.isVerified ? "#2F6F61" : "#f4f3f4"}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => setSelectedUser(selectedUser === item._id ? null : item._id)}
        >
          <MaterialCommunityIcons name="dots-vertical" size={20} color="#666" />
        </TouchableOpacity>

        {selectedUser === item._id && (
          <View style={styles.actionMenu}>
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={() => {
                // View user details
                setSelectedUser(null);
              }}
            >
              <MaterialCommunityIcons name="eye" size={16} color="#666" />
              <Text style={styles.actionMenuText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={() => {
                deleteUser(item._id);
                setSelectedUser(null);
              }}
            >
              <MaterialCommunityIcons name="delete" size={16} color="#FF5252" />
              <Text style={[styles.actionMenuText, { color: '#FF5252' }]}>Delete User</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#2F6F61" />
        <Text style={styles.footerText}>Loading more users...</Text>
      </View>
    );
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
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={styles.headerSubtitle}>{users.length} users found</Text>
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
            placeholder="Search users by name or email..."
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
            { key: 'all', label: 'All Users', icon: 'account-group' },
            { key: 'verified', label: 'Verified', icon: 'check-circle' },
            { key: 'unverified', label: 'Pending', icon: 'clock-alert' },
            { key: 'recent', label: 'Recent', icon: 'clock' },
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
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderUserItem}
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
            <MaterialCommunityIcons name="account-search" size={80} color="#E1EDE7" />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>
              {search || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'No users registered yet'
              }
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
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
  userItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
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
  userAvatar: {
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F2F2F',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  userMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  userActions: {
    alignItems: 'center',
    position: 'relative',
  },
  switchContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
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
});