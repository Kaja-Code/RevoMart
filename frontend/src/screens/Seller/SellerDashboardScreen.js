// frontend/src/screens/Seller/SellerDashboardScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Image,
  Dimensions,
  FlatList
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';
import Layout from '../../components/Layouts';

const { width } = Dimensions.get('window');

export default function SellerDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const [dashboardData, setDashboardData] = useState({
    notifications: [],
    stats: [],
    recentActivity: {
      newMessages: 0,
      newInquiries: 0,
      priceOffers: 0,
      productViews: 0,
      totalUnread: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      const response = await fetch(
        `${API_URL}/api/notifications/seller/dashboard?days=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      } else {
        console.error('Error fetching dashboard data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setRefreshing(false));
  }, [selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [selectedPeriod])
  );

  const formatTime = (date) => {
    if (!date) return "";
    const messageDate = new Date(date);
    const now = new Date();
    const diffH = (now - messageDate) / (1000 * 60 * 60);
    
    if (diffH < 1) {
      const diffM = Math.floor(diffH * 60);
      return diffM < 1 ? "now" : `${diffM}m`;
    } else if (diffH < 24) {
      return `${Math.floor(diffH)}h`;
    } else if (diffH < 48) {
      return "yesterday";
    } else {
      return messageDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
      'new_message': '#2F6F61',
      'new_inquiry': '#2F6F61',
      'price_offer': '#2F6F61',
      'swap_request': '#2F6F61',
      'product_liked': '#2F6F61',
      'product_viewed': '#2F6F61',
      'call_missed': '#2F6F61'
    };
    return colors[type] || '#8E8E93';
  };

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

      // Refresh data to update read status
      fetchDashboardData();
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

      Alert.alert('Success', 'All notifications marked as read');
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const renderStatCard = (title, value, icon, color, onPress) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statIconContainer}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
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
          {item.createdAt && (
            <Text style={[styles.notificationTime, !item.isRead && styles.unreadTime]}>
              {formatTime(item.createdAt)}
            </Text>
          )}
        </View>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        
        {item.data?.productTitle && (
          <Text style={styles.notificationProduct} numberOfLines={1}>
            💬 About: {item.data.productTitle}
          </Text>
        )}
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

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {[1, 7, 30].map(days => (
        <TouchableOpacity
          key={days}
          style={[
            styles.periodButton,
            selectedPeriod === days && styles.selectedPeriodButton
          ]}
          onPress={() => setSelectedPeriod(days)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === days && styles.selectedPeriodButtonText
          ]}>
            {days === 1 ? 'Today' : `${days} days`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Layout>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Seller Dashboard</Text>
            <Text style={styles.subtitle}>Manage your sales & notifications</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationSettings')}
            style={styles.settingsButton}
          >
            <MaterialCommunityIcons name="cog" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        {renderPeriodSelector()}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            {renderStatCard(
              'New Messages',
              dashboardData.recentActivity.newMessages,
              'message-text',
              '#2F6F61',
              () => navigation.navigate('Messages')
            )}
            
            {renderStatCard(
              'New Inquiries',
              dashboardData.recentActivity.newInquiries,
              'help-circle',
              '#2F6F61',
              () => navigation.navigate('Messages')
            )}
          </View>

          <View style={styles.statsRow}>
            {renderStatCard(
              'Price Offers',
              dashboardData.recentActivity.priceOffers,
              'currency-usd',
              '#2F6F61',
              () => navigation.navigate('Messages')
            )}
            
            {renderStatCard(
              'Product Views',
              dashboardData.recentActivity.productViews,
              'eye',
              '#2F6F61',
              () => {}
            )}
          </View>
        </View>

        {/* Unread Summary */}
        {dashboardData.recentActivity.totalUnread > 0 && (
          <View style={styles.unreadSummary}>
            <View style={styles.unreadSummaryContent}>
              <MaterialCommunityIcons name="bell-alert" size={24} color="#2F6F61" />
              <Text style={styles.unreadSummaryText}>
                You have {dashboardData.recentActivity.totalUnread} unread notifications
              </Text>
            </View>
            <TouchableOpacity
              onPress={markAllAsRead}
              style={styles.markAllReadButton}
            >
              <Text style={styles.markAllReadText}>Mark All Read</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddProduct')}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={() => navigation.navigate('Messages')}
            >
              <MaterialCommunityIcons name="chat" size={24} color="#2F6F61" />
              <Text style={[styles.actionButtonText, styles.secondaryActionText]}>View Chats</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Notifications */}
        <View style={styles.notificationsSection}>
          <View style={styles.notificationsSectionHeader}>
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AllNotifications')}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {dashboardData.notifications.length === 0 ? (
            <View style={styles.emptyNotifications}>
              <MaterialCommunityIcons name="bell-off" size={80} color="#E0E6E3" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                Notifications about your products will appear here
              </Text>
            </View>
          ) : (
            <FlatList
              data={dashboardData.notifications.slice(0, 10)}
              keyExtractor={(item) => item._id}
              renderItem={renderNotificationItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>

        {/* Performance Insights */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Performance Insights</Text>
          
          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="trending-up" size={24} color="#2F6F61" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Response Time</Text>
              <Text style={styles.insightValue}>Fast responder</Text>
              <Text style={styles.insightDescription}>
                You typically respond to messages within 30 minutes
              </Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="chart-line" size={24} color="#2F6F61" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Activity Level</Text>
              <Text style={styles.insightValue}>
                {dashboardData.recentActivity.totalUnread + 
                 dashboardData.recentActivity.newMessages + 
                 dashboardData.recentActivity.newInquiries > 10 ? 'High' : 'Moderate'}
              </Text>
              <Text style={styles.insightDescription}>
                Based on your recent interactions
              </Text>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Tips for Better Sales</Text>
          
          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="lightbulb" size={20} color="#2F6F61" />
            <Text style={styles.tipText}>
              Respond to inquiries quickly to increase your chances of making a sale
            </Text>
          </View>

          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="camera" size={20} color="#2F6F61" />
            <Text style={styles.tipText}>
              Add high-quality photos to attract more buyers
            </Text>
          </View>

          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="tag" size={20} color="#2F6F61" />
            <Text style={styles.tipText}>
              Price your items competitively based on market research
            </Text>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F6',
    marginHorizontal: -14,
    marginVertical: -12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#F5F7F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1C',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 4,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: '#2F6F61',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F6F61',
  },
  selectedPeriodButtonText: {
    color: '#FFFFFF',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 6,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1C',
  },
  statTitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 2,
  },
  unreadSummary: {
    backgroundColor: '#F8FFFD',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: '#2F6F61',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  unreadSummaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unreadSummaryText: {
    fontSize: 16,
    color: '#2F6F61',
    marginLeft: 12,
    flex: 1,
    fontWeight: '600',
  },
  markAllReadButton: {
    backgroundColor: '#2F6F61',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  markAllReadText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1C',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2F6F61',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  secondaryAction: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2F6F61',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  secondaryActionText: {
    color: '#2F6F61',
  },
  notificationsSection: {
    marginBottom: 20,
  },
  notificationsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 16,
    color: '#2F6F61',
    fontWeight: '600',
  },
  emptyNotifications: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1C',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: 8,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  unreadNotification: {
    borderLeftColor: '#2F6F61',
    backgroundColor: '#F8FFFD',
    shadowOpacity: 0.08,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E6E3',
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
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1C',
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  notificationTime: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  unreadTime: {
    color: '#2F6F61',
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationProduct: {
    fontSize: 14,
    color: '#2F6F61',
    fontWeight: '500',
    marginTop: 2,
  },
  notificationProductImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  insightsSection: {
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  insightContent: {
    marginLeft: 12,
    flex: 1,
  },
  insightTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1C',
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F6F61',
    marginTop: 2,
  },
  insightDescription: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 4,
  },
  tipsSection: {
    marginBottom: 20,
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  tipText: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
});