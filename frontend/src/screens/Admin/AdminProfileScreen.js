import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function AdminProfileScreen({ navigation }) {
  const { userDetails, logout } = useAuth();

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from admin panel?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: logout 
        }
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Password change functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  const handleSystemSettings = () => {
    Alert.alert(
      'System Settings',
      'System settings panel will be available in the next update.',
      [{ text: 'OK' }]
    );
  };

  const handleViewAuditLog = () => {
    Alert.alert(
      'Audit Log',
      'Audit log feature coming soon.',
      [{ text: 'OK' }]
    );
  };

  const renderInfoCard = (title, value, icon, color = '#2F6F61') => (
    <Animated.View 
      style={[
        styles.infoCard,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0]
            })
          }]
        }
      ]}
    >
      <View style={[styles.infoIcon, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={16} color="#999" />
    </Animated.View>
  );

  const renderActionItem = (title, description, icon, onPress, color = '#2F6F61', danger = false) => (
    <TouchableOpacity 
      style={styles.actionItem}
      onPress={onPress}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons 
          name={icon} 
          size={20} 
          color={danger ? "#f44336" : color} 
        />
      </View>
      <View style={styles.actionContent}>
        <Text style={[styles.actionTitle, danger && { color: "#f44336" }]}>
          {title}
        </Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <MaterialCommunityIcons 
        name="chevron-right" 
        size={20} 
        color="#999" 
      />
    </TouchableOpacity>
  );

  const getPermissionsCount = () => {
    return userDetails?.permissions?.length || 0;
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'super_admin': return '#FF6F61';
      case 'admin': return '#2F6F61';
      case 'moderator': return '#2196F3';
      default: return '#666';
    }
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
            <Text style={styles.headerTitle}>Admin Profile</Text>
            <Text style={styles.headerSubtitle}>Account & Settings</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="cog-outline" size={24} color="#2F6F61" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <Animated.View 
            style={[
              styles.avatarContainer,
              {
                opacity: fadeAnim,
                transform: [{
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  })
                }]
              }
            ]}
          >
            <View style={styles.avatarBackground}>
              <MaterialCommunityIcons name="shield-account" size={60} color="#2F6F61" />
            </View>
          </Animated.View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userDetails?.username || 'Admin User'}</Text>
            <Text style={styles.profileEmail}>{userDetails?.email || 'admin@revoMart.com'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userDetails?.role) + '20' }]}>
              <MaterialCommunityIcons 
                name="shield-check" 
                size={14} 
                color={getRoleColor(userDetails?.role)} 
              />
              <Text style={[styles.roleText, { color: getRoleColor(userDetails?.role) }]}>
                {userDetails?.role?.replace('_', ' ').toUpperCase() || 'ADMIN'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getPermissionsCount()}</Text>
            <Text style={styles.statLabel}>Permissions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {userDetails?.lastLoginDate ? 'Active' : 'Never'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>v1.0</Text>
            <Text style={styles.statLabel}>Version</Text>
          </View>
        </View>

        {/* Account Information */}
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoSection}>
          {renderInfoCard(
            'Admin Role', 
            userDetails?.role?.replace('_', ' ').toUpperCase() || 'N/A',
            'shield-account',
            getRoleColor(userDetails?.role)
          )}
          {renderInfoCard(
            'Permissions Count', 
            getPermissionsCount().toString(),
            'key-variant',
            '#FF9800'
          )}
          {renderInfoCard(
            'Last Active', 
            userDetails?.lastLoginDate 
              ? new Date(userDetails.lastLoginDate).toLocaleDateString()
              : 'Never logged in',
            'clock-outline',
            '#2196F3'
          )}
          {renderInfoCard(
            'Account Created', 
            userDetails?.createdAt
              ? new Date(userDetails.createdAt).toLocaleDateString()
              : 'N/A',
            'calendar',
            '#4CAF50'
          )}
        </View>

        {/* Permissions */}
        <Text style={styles.sectionTitle}>Admin Permissions</Text>
        <View style={styles.permissionsContainer}>
          {userDetails?.permissions?.map((permission, index) => (
            <Animated.View 
              key={permission} 
              style={[
                styles.permissionItem,
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateX: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50 * (index % 2 === 0 ? -1 : 1), 0]
                    })
                  }]
                }
              ]}
            >
              <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.permissionText}>
                {permission.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </Animated.View>
          ))}
          
          {(!userDetails?.permissions || userDetails.permissions.length === 0) && (
            <View style={styles.noPermissions}>
              <MaterialCommunityIcons name="key-remove" size={32} color="#E1EDE7" />
              <Text style={styles.noPermissionsText}>No permissions assigned</Text>
            </View>
          )}
        </View>

        {/* Admin Actions */}
        <Text style={styles.sectionTitle}>Admin Actions</Text>
        <View style={styles.actionsContainer}>
          {renderActionItem(
            'Change Password',
            'Update your account password',
            'lock-reset',
            handleChangePassword,
            '#2196F3'
          )}
          {renderActionItem(
            'System Settings',
            'Configure system preferences',
            'cog-outline',
            handleSystemSettings,
            '#FF9800'
          )}
          {renderActionItem(
            'Audit Log',
            'View system activity logs',
            'clipboard-list',
            handleViewAuditLog,
            '#4CAF50'
          )}
          {renderActionItem(
            'Logout',
            'Sign out from admin panel',
            'logout',
            handleLogout,
            '#f44336',
            true
          )}
        </View>

        {/* System Information */}
        <View style={styles.systemInfo}>
          <View style={styles.systemHeader}>
            <MaterialCommunityIcons name="information" size={20} color="#2F6F61" />
            <Text style={styles.systemInfoTitle}>System Information</Text>
          </View>
          <Text style={styles.systemInfoText}>
            RevoMart Admin Panel v1.0{'\n'}
            Built with React Native & Node.js{'\n'}
            Last updated: {new Date().toLocaleDateString()}
          </Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    padding: 30,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatarBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(225, 237, 231, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(47, 111, 97, 0.2)',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2F2F2F',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2F6F61',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(47, 111, 97, 0.2)',
    marginHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2F6F61',
    marginTop: 20,
    marginBottom: 15,
    marginLeft: 5,
  },
  infoSection: {
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginVertical: 5,
    borderRadius: 18,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#2F2F2F',
    fontWeight: '600',
  },
  permissionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225, 237, 231, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexBasis: '48%',
  },
  permissionText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#2F6F61',
    fontWeight: '500',
    flex: 1,
  },
  noPermissions: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  noPermissionsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  actionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(47, 111, 97, 0.1)',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F2F2F',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
  },
  systemInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#2F6F61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 111, 97, 0.1)',
  },
  systemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  systemInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F6F61',
    marginLeft: 8,
  },
  systemInfoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
});