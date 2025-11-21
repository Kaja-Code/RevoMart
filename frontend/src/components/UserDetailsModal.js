// frontend/src/components/UserDetailsModal.js - PHASE 1
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Switch,
  Alert,
  Dimensions
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../constants/config';

const { width } = Dimensions.get('window');

export default function UserDetailsModal({ visible, userId, onClose }) {
  const { user } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, activity, products, analytics

  useEffect(() => {
    if (visible && userId) {
      fetchUserDetails();
    }
  }, [visible, userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      // Fetch user details with additional analytics
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setUserDetails(prev => ({ ...prev, user: { ...prev.user, isVerified: verified } }));
        Alert.alert('Success', `User ${verified ? 'verified' : 'unverified'} successfully`);
      }
    } catch (error) {
      console.error('Error updating verification:', error);
      Alert.alert('Error', 'Failed to update verification status');
    }
  };

  const handleBanUser = () => {
    Alert.alert(
      'Ban User',
      'Are you sure you want to ban this user? They will not be able to access the platform.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await user.getIdToken();
              await fetch(`${API_URL}/api/admin/users/${userId}/ban`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              Alert.alert('Success', 'User banned successfully');
              onClose();
            } catch (error) {
              console.error('Error banning user:', error);
              Alert.alert('Error', 'Failed to ban user');
            }
          }
        }
      ]
    );
  };

  const handleSendMessage = () => {
    Alert.alert('Send Message', 'Message functionality to be implemented');
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* User Info Card */}
      <View style={styles.card}>
        <View style={styles.userHeader}>
          <Image
            source={
              userDetails.user.profilePictureUrl
                ? { uri: userDetails.user.profilePictureUrl }
                : require('../../assets/Profile.png')
            }
            style={styles.profileImage}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userDetails.user.username}</Text>
            <Text style={styles.userEmail}>{userDetails.user.email}</Text>
            <View style={styles.verificationRow}>
              <MaterialCommunityIcons
                name={userDetails.user.isVerified ? 'check-circle' : 'alert-circle'}
                size={16}
                color={userDetails.user.isVerified ? '#4CAF50' : '#FF9800'}
              />
              <Text style={styles.verificationText}>
                {userDetails.user.isVerified ? 'Verified' : 'Unverified'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <MaterialCommunityIcons name="package-variant" size={24} color="#2F6F61" />
            <Text style={styles.quickStatValue}>{userDetails.stats?.totalProducts || 0}</Text>
            <Text style={styles.quickStatLabel}>Products</Text>
          </View>
          <View style={styles.quickStat}>
            <MaterialCommunityIcons name="message-text" size={24} color="#2196F3" />
            <Text style={styles.quickStatValue}>{userDetails.stats?.messagesSent || 0}</Text>
            <Text style={styles.quickStatLabel}>Messages</Text>
          </View>
          <View style={styles.quickStat}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#FF9800" />
            <Text style={styles.quickStatValue}>{userDetails.stats?.reportsFiled || 0}</Text>
            <Text style={styles.quickStatLabel}>Reports</Text>
          </View>
        </View>
      </View>

      {/* Account Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>{userDetails.user.phoneNumber || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Address:</Text>
          <Text style={styles.detailValue}>{userDetails.user.address || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Registration Date:</Text>
          <Text style={styles.detailValue}>
            {new Date(userDetails.user.registrationDate).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Last Login:</Text>
          <Text style={styles.detailValue}>
            {userDetails.user.lastLoginDate
              ? new Date(userDetails.user.lastLoginDate).toLocaleDateString()
              : 'Never'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Account Age:</Text>
          <Text style={styles.detailValue}>
            {Math.floor(
              (Date.now() - new Date(userDetails.user.registrationDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )}{' '}
            days
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Rating:</Text>
          <View style={styles.ratingContainer}>
            <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
            <Text style={styles.detailValue}>
              {userDetails.user.ratingAverage?.toFixed(1) || '0.0'}
            </Text>
          </View>
        </View>
      </View>

      {/* Verification Control */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Control</Text>
        
        <View style={styles.controlRow}>
          <View>
            <Text style={styles.controlLabel}>Verified Status</Text>
            <Text style={styles.controlSubtext}>Grant or revoke verification badge</Text>
          </View>
          <Switch
            value={userDetails.user.isVerified}
            onValueChange={handleVerificationToggle}
            trackColor={{ false: '#e0e0e0', true: '#4CAF50' }}
            thumbColor={userDetails.user.isVerified ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>
    </View>
  );

  const renderActivityTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        
        {userDetails.activity?.recentActions?.length > 0 ? (
          userDetails.activity.recentActions.map((action, index) => (
            <View key={index} style={styles.activityItem}>
              <MaterialCommunityIcons
                name={getActivityIcon(action.type)}
                size={20}
                color={getActivityColor(action.type)}
              />
              <View style={styles.activityInfo}>
                <Text style={styles.activityText}>{action.description}</Text>
                <Text style={styles.activityTime}>
                  {new Date(action.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent activity</Text>
        )}
      </View>

      {/* Login History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Login History</Text>
        {userDetails.activity?.loginHistory?.slice(0, 5).map((login, index) => (
          <View key={index} style={styles.loginItem}>
            <MaterialCommunityIcons name="login" size={18} color="#2196F3" />
            <View style={styles.loginInfo}>
              <Text style={styles.loginDate}>
                {new Date(login.timestamp).toLocaleString()}
              </Text>
              <Text style={styles.loginDevice}>{login.device || 'Unknown Device'}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderProductsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listed Products</Text>
        
        {userDetails.products?.length > 0 ? (
          userDetails.products.map((product) => (
            <View key={product._id} style={styles.productItem}>
              <Image
                source={{ uri: product.imagesUrls?.[0] }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productPrice}>LKR {product.price?.toLocaleString()}</Text>
                <View style={[styles.productStatus, { backgroundColor: getStatusColor(product.status) }]}>
                  <Text style={styles.productStatusText}>{product.status}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No products listed</Text>
        )}
      </View>
    </View>
  );

  const renderAnalyticsTab = () => (
    <View style={styles.tabContent}>
      {/* Engagement Score */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Engagement Score</Text>
        <View style={styles.scoreContainer}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>
              {userDetails.analytics?.engagementScore || 0}
            </Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
          <Text style={styles.scoreDescription}>
            Based on activity, response rate, and user interactions
          </Text>
        </View>
      </View>

      {/* Trust Score */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trust Score</Text>
        <View style={styles.trustMeter}>
          <View style={styles.trustBar}>
            <View
              style={[
                styles.trustBarFill,
                { width: `${userDetails.analytics?.trustScore || 0}%` }
              ]}
            />
          </View>
          <Text style={styles.trustValue}>{userDetails.analytics?.trustScore || 0}%</Text>
        </View>
        <Text style={styles.trustDescription}>
          Calculated from verification, ratings, and successful transactions
        </Text>
      </View>

      {/* Activity Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Activity Last 7 Days</Text>
        {userDetails.analytics?.activityChart && (
          <LineChart
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [
                {
                  data: userDetails.analytics.activityChart || [0, 0, 0, 0, 0, 0, 0]
                }
              ]
            }}
            width={width - 64}
            height={180}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(47, 111, 97, ${opacity})`,
              style: {
                borderRadius: 8
              }
            }}
            bezier
            style={styles.chart}
          />
        )}
      </View>

      {/* Response Rate */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Response Metrics</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Average Response Time:</Text>
          <Text style={styles.metricValue}>
            {userDetails.analytics?.avgResponseTime || 'N/A'}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Response Rate:</Text>
          <Text style={styles.metricValue}>
            {userDetails.analytics?.responseRate || 0}%
          </Text>
        </View>
      </View>
    </View>
  );

  const getActivityIcon = (type) => {
    const icons = {
      product_listed: 'package-variant-closed',
      message_sent: 'message-text',
      login: 'login',
      product_sold: 'cash',
      report_filed: 'alert-circle'
    };
    return icons[type] || 'circle';
  };

  const getActivityColor = (type) => {
    const colors = {
      product_listed: '#4CAF50',
      message_sent: '#2196F3',
      login: '#9C27B0',
      product_sold: '#FF9800',
      report_filed: '#f44336'
    };
    return colors[type] || '#666';
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#4CAF50',
      sold: '#2196F3',
      swapped: '#FF9800',
      removed: '#666'
    };
    return colors[status] || '#999';
  };

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2F6F61" />
              <Text style={styles.loadingText}>Loading user details...</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (!userDetails) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>User Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabNavigation}>
            {['overview', 'activity', 'products', 'analytics'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'activity' && renderActivityTab()}
            {activeTab === 'products' && renderProductsTab()}
            {activeTab === 'analytics' && renderAnalyticsTab()}
          </ScrollView>

          {/* Quick Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSendMessage}>
              <MaterialCommunityIcons name="message-text" size={18} color="#2F6F61" />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleBanUser}
            >
              <MaterialCommunityIcons name="cancel" size={18} color="#f44336" />
              <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Ban User</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#2F6F61',
  },
  tabButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  tabContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  controlSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  loginItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  loginInfo: {
    marginLeft: 12,
  },
  loginDate: {
    fontSize: 13,
    color: '#333',
  },
  loginDevice: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  productItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 13,
    color: '#2F6F61',
    fontWeight: '600',
    marginBottom: 6,
  },
  productStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  productStatusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2F6F61',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  scoreDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  trustMeter: {
    marginVertical: 12,
  },
  trustBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  trustBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  trustValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  trustDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F6F61',
  },
  dangerButton: {
    backgroundColor: '#ffebee',
  },
  dangerButtonText: {
    color: '#f44336',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
});
     