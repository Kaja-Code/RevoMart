import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';

const { width } = Dimensions.get('window');

export default function AdminDashboardScreen() {
  const { user, userDetails } = useAuth();
  const navigation = useNavigation();
  
  const [stats, setStats] = useState({
    totalUsers: 19,
    totalProducts: 31,
    totalComplaints: 0,
    totalFeedback: 0,
    recentUsers: 0,
    recentProducts: 0,
    pendingComplaints: 0,
    systemHealth: 95,
    activeSessions: 0,
    revenue: 0,
    conversionRate: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const fadeAnim = useState(new Animated.Value(0))[0];

  const fetchDashboardData = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setRefreshing(false));
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const renderStatCard = (title, value, icon, color, subtitle = '', trend = null) => (
    <Animated.View 
      style={[
        styles.statCard, 
        { 
          opacity: fadeAnim,
          borderLeftColor: color
        }
      ]}
    >
      <View style={styles.statContent}>
        <View style={styles.statHeader}>
          <Text style={styles.statValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
          {trend && (
            <View style={[styles.trendIndicator, { backgroundColor: trend > 0 ? '#4CAF50' : '#FF5252' }]}>
              <MaterialCommunityIcons 
                name={trend > 0 ? 'trending-up' : 'trending-down'} 
                size={14} 
                color="#FFF" 
              />
              <Text style={styles.trendText}>{Math.abs(trend)}%</Text>
            </View>
          )}
        </View>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={20} color="#FFFFFF" />
      </View>
    </Animated.View>
  );

  const renderQuickAction = (title, icon, color, description, onPress) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickActionContent}>
        <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.quickActionText}>
          <Text style={styles.quickActionTitle}>{title}</Text>
          <Text style={styles.quickActionDesc}>{description}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#2F6F61" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6F61" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with glass effect */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>
              Welcome back, {userDetails?.username} • {userDetails?.role}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileButton}
          >
            <MaterialCommunityIcons name="account-circle" size={36} color="#2F6F61" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#2F6F61']}
            tintColor="#2F6F61"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* System Health Banner */}
        <View style={styles.healthBanner}>
          <View style={styles.healthContent}>
            <MaterialCommunityIcons name="server" size={24} color="#2F6F61" />
            <View style={styles.healthText}>
              <Text style={styles.healthTitle}>System Health</Text>
              <Text style={styles.healthValue}>{stats.systemHealth}% Optimal</Text>
            </View>
          </View>
          <View style={styles.healthProgress}>
            <View 
              style={[
                styles.healthProgressBar, 
                { width: `${stats.systemHealth}%` }
              ]} 
            />
          </View>
        </View>

        {/* Key Metrics */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            {renderStatCard(
              'Total Users',
              stats.totalUsers,
              'account-group',
              '#2F6F61',
              'Active users',
              stats.recentUsers > 0 ? (stats.recentUsers / stats.totalUsers * 100) : 0
            )}
            {renderStatCard(
              'Products',
              stats.totalProducts,
              'package-variant',
              '#FF6F61',
              'In inventory',
              stats.recentProducts > 0 ? (stats.recentProducts / stats.totalProducts * 100) : 0
            )}
          </View>
          <View style={styles.statsRow}>
            {renderStatCard(
              'Revenue',
              stats.revenue > 0 ? `$${(stats.revenue / 1000).toFixed(1)}k` : 'N/A',
              'currency-usd',
              '#4CAF50',
              'This month',
              12.5
            )}
            {renderStatCard(
              'Sessions',
              stats.activeSessions,
              'chart-line',
              '#2196F3',
              'Active now',
              8.3
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.quickActionsContainer}>
          {userDetails?.permissions?.includes('users_manage') &&
            renderQuickAction(
              'User Management',
              'account-settings',
              '#2F6F61',
              'Manage user accounts and permissions',
              () => navigation.navigate('Users')
            )}
          
          {userDetails?.permissions?.includes('products_manage') &&
            renderQuickAction(
              'Product Catalog',
              'package-variant-closed',
              '#FF6F61',
              'Manage products and inventory',
              () => navigation.navigate('Products')
            )}

          {userDetails?.permissions?.includes('complaints_manage') &&
            renderQuickAction(
              'Complaint Center',
              'alert-circle-check',
              '#FF9500',
              'Review and resolve complaints',
              () => navigation.navigate('Complaints')
            )}

          {userDetails?.permissions?.includes('feedback_view') &&
            renderQuickAction(
              'Customer Feedback',
              'message-processing',
              '#4CAF50',
              'View customer feedback and insights',
              () => navigation.navigate('AdminFeedback')
            )}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.activitiesContainer}>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#2F6F61' }]}>
              <MaterialCommunityIcons name="account-plus" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>{stats.recentUsers} new users registered today</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#FF6F61' }]}>
              <MaterialCommunityIcons name="package-variant-closed" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>{stats.recentProducts} new products added</Text>
              <Text style={styles.activityTime}>5 hours ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#FF9500' }]}>
              <MaterialCommunityIcons name="alert" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>{stats.pendingComplaints} complaints need attention</Text>
              <Text style={styles.activityTime}>1 day ago</Text>
            </View>
          </View>
        </View>

        {/* System Status */}
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.systemStatus}>
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="server-network" size={18} color="#4CAF50" />
            <Text style={styles.statusText}>API Server</Text>
            <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
          </View>
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="database" size={18} color="#4CAF50" />
            <Text style={styles.statusText}>Database</Text>
            <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
          </View>
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="email" size={18} color="#4CAF50" />
            <Text style={styles.statusText}>Email Service</Text>
            <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2F6F61',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  profileButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  healthBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  healthContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  healthText: {
    marginLeft: 12,
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2F6F61',
  },
  healthValue: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  healthProgress: {
    height: 8,
    backgroundColor: 'rgba(47, 111, 97, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthProgressBar: {
    height: '100%',
    backgroundColor: '#2F6F61',
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2F6F61',
    letterSpacing: 0.3,
  },
  seeAllText: {
    fontSize: 14,
    color: '#2F6F61',
    fontWeight: '600',
  },
  statsGrid: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 6,
    borderLeftWidth: 4,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2F2F2F',
    marginRight: 8,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F6F61',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  quickAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F2F2F',
    marginBottom: 2,
  },
  quickActionDesc: {
    fontSize: 12,
    color: '#666',
  },
  activitiesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(47, 111, 97, 0.1)',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#2F2F2F',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  systemStatus: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#2F2F2F',
    marginLeft: 12,
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});