// frontend/src/screens/Notifications/AllNotificationsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';

export default function AllNotificationsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filterTypes = [
    { key: 'all', label: 'All', icon: 'bell' },
    { key: 'new_message', label: 'Messages', icon: 'message-text' },
    { key: 'new_inquiry', label: 'Inquiries', icon: 'help-circle' },
    { key: 'price_offer', label: 'Offers', icon: 'currency-usd' },
    { key: 'product_liked', label: 'Likes', icon: 'heart' }
  ];

  const fetchNotifications = async (pageNum = 1, filter = 'all', reset = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const token = await user.getIdToken();
      let url = `${API_URL}/api/notifications?page=${pageNum}&limit=20`;
      
      if (filter !== 'all') {
        url += `&type=${filter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        const newNotifications = data.data.notifications;
        
        if (reset || pageNum === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        setUnreadCount(data.data.unreadCount);
        setHasMore(data.data.pagination.hasNextPage);
        setPage(pageNum);
      } else {
        console.error('Error fetching notifications:', data.error);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(1, selectedFilter, true).finally(() => setRefreshing(false));
  }, [selectedFilter]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNotifications(page + 1, selectedFilter);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(1, selectedFilter, true);
    }, [selectedFilter])
  );

  const handleNotificationPress = async (notification) => {
    try {
      // Mark as read
      const token = await user.getIdToken();
      await fetch(`${API_URL}/api/notifications/mark-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notificationIds: [notification._id]
        })
      });

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n._id === notification._id ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Navigate based on notification type
      if (notification.conversationId) {
        navigation.navigate('Chat', {
          conversation: { _id: notification.conversationId },
          otherUser: {
            _id: notification.senderId._id,
            username: notification.senderId.username,
            profilePictureUrl: notification.senderId.profilePictureUrl
          }
        });
      } else if (notification.productId) {
        navigation.navigate('ProductDetails', {
          product: notification.productId
        });
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await user.getIdToken();
      await fetch(`${API_URL}/api/notifications/mark-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          markAll: true
        })
      });

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        Alert.alert('Success', 'Notification deleted');
      } else {
        Alert.alert('Error', 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const confirmDelete = (notification) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNotification(notification._id)
        }
      ]
    );
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'new_message': 'message-text',
      'new_inquiry': 'help-circle',
      'price_offer': 'currency-usd',
      'swap_request': 'swap-horizontal',
      'product_liked': 'heart',
      'product_viewed': 'eye',
      'call_missed': 'phone-missed'
    };
    return icons[type] || 'bell';
  };

  const getNotificationColor = (type) => {
    const colors = {
      'new_message': '#2f95dc',
      'new_inquiry': '#ff6f61',
      'price_offer': '#4caf50',
      'swap_request': '#ff9800',
      'product_liked': '#e91e63',
      'product_viewed': '#9c27b0',
      'call_missed': '#f44336'
    };
    return colors[type] || '#666';
  };

  const filteredNotifications = notifications.filter(notification =>
    notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (notification.data?.senderName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <MaterialCommunityIcons
          name={getNotificationIcon(item.type)}
          size={20}
          color={getNotificationColor(item.type)}
        />
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.isRead && styles.unreadText]}>
            {item.title}
          </Text>
          <TouchableOpacity
            onPress={() => confirmDelete(item)}
            style={styles.deleteButton}
          >
            <MaterialCommunityIcons name="close" size={16} color="#999" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        
        {item.data?.productTitle && (
          <Text style={styles.notificationProduct}>
            Product: {item.data.productTitle}
          </Text>
        )}

        <View style={styles.notificationFooter}>
          <Text style={styles.notificationTime}>
            {formatTime(item.createdAt)}
          </Text>
          
          {item.data?.senderName && (
            <Text style={styles.notificationSender}>
              from {item.data.senderName}
            </Text>
          )}
        </View>
      </View>
      
      {item.data?.productImage && (
        <Image
          source={{ uri: item.data.productImage }}
          style={styles.notificationProductImage}
        />
      )}
      
      {!item.isRead && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  const renderFilterButton = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === item.key && styles.selectedFilterButton
      ]}
      onPress={() => setSelectedFilter(item.key)}
    >
      <MaterialCommunityIcons
        name={item.icon}
        size={16}
        color={selectedFilter === item.key ? '#fff' : '#666'}
      />
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === item.key && styles.selectedFilterButtonText
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notifications..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <MaterialCommunityIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter buttons */}
      <FlatList
        data={filterTypes}
        keyExtractor={(item) => item.key}
        renderItem={renderFilterButton}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterList}
        contentContainerStyle={styles.filterListContent}
      />

      {/* Stats */}
      {unreadCount > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            onPress={markAllAsRead}
            style={styles.markAllReadButton}
          >
            <Text style={styles.markAllReadText}>Mark All Read</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#2f95dc" />
        <Text style={styles.loadingText}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="bell-off" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptyMessage}>
        {searchQuery 
          ? `No notifications match "${searchQuery}"`
          : selectedFilter === 'all' 
            ? 'You have no notifications yet'
            : `No ${filterTypes.find(f => f.key === selectedFilter)?.label.toLowerCase()} notifications`
        }
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setShowSearch(!showSearch)}
            style={styles.headerButton}
          >
            <MaterialCommunityIcons 
              name={showSearch ? "close" : "magnify"} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationSettings')}
            style={styles.headerButton}
          >
            <MaterialCommunityIcons name="cog" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item._id}
        renderItem={renderNotificationItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredNotifications.length === 0 ? styles.emptyList : undefined}
      />

      {loading && notifications.length === 0 && (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#2f95dc" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButton: {
    marginLeft: 16,
    padding: 4,
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  filterList: {
    marginBottom: 16,
  },
  filterListContent: {
    paddingHorizontal: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  selectedFilterButton: {
    backgroundColor: '#2f95dc',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  selectedFilterButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6f61',
  },
  statsText: {
    fontSize: 14,
    color: '#856404',
    flex: 1,
  },
  markAllReadButton: {
    backgroundColor: '#ff6f61',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  markAllReadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#2f95dc',
    backgroundColor: '#f8f9ff',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '600',
    color: '#000',
  },
  deleteButton: {
    padding: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  notificationProduct: {
    fontSize: 12,
    color: '#2f95dc',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationSender: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  notificationProductImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: 12,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2f95dc',
    position: 'absolute',
    top: 16,
    right: 16,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  centerLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});