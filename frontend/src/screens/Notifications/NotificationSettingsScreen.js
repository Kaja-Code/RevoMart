import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    messageNotifications: true,
    offerNotifications: true,
    productUpdates: true,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00'
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [editingTime, setEditingTime] = useState(null);
  const [tempTime, setTempTime] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/notifications/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings || {
          pushNotifications: true,
          emailNotifications: true,
          messageNotifications: true,
          offerNotifications: true,
          productUpdates: true,
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00'
          }
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/notifications/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSettings)
      });

      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings || newSettings);
      } else {
        Alert.alert('Error', 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key, value) => {
    const newSettings = { ...settings };
    
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      newSettings[parent] = {
        ...newSettings[parent],
        [child]: value
      };
    } else {
      newSettings[key] = value;
    }
    
    updateSettings(newSettings);
  };

  const handleTimeChange = (timeType, time) => {
    const newSettings = {
      ...settings,
      quietHours: {
        ...settings.quietHours,
        [timeType]: time
      }
    };
    
    updateSettings(newSettings);
    setShowTimeModal(false);
  };

  const validateTime = (time) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const openTimeModal = (timeType) => {
    setEditingTime(timeType);
    setTempTime(settings.quietHours[timeType]);
    setShowTimeModal(true);
  };

  const testNotification = async () => {
    try {
      const token = await user.getIdToken();
      await fetch(`${API_URL}/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test notification to check your settings!'
        })
      });

      Alert.alert('Test Sent', 'A test notification has been sent to your device');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const renderSettingItem = (title, subtitle, value, onToggle, icon, iconColor = '#2f95dc') => (
    <View style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#e0e0e0', true: '#2f95dc' }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
        disabled={loading}
      />
    </View>
  );

  const renderTimeSelector = (label, timeType, time) => (
    <TouchableOpacity
      style={styles.timeSelector}
      onPress={() => openTimeModal(timeType)}
      disabled={!settings.quietHours.enabled}
    >
      <Text style={[
        styles.timeLabel, 
        !settings.quietHours.enabled && styles.disabledText
      ]}>
        {label}
      </Text>
      <View style={styles.timeValue}>
        <Text style={[
          styles.timeText,
          !settings.quietHours.enabled && styles.disabledText
        ]}>
          {time}
        </Text>
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={20} 
          color={settings.quietHours.enabled ? '#666' : '#ccc'} 
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* General Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          {renderSettingItem(
            'Push Notifications',
            'Receive notifications on your device',
            settings.pushNotifications,
            (value) => handleToggle('pushNotifications', value),
            'bell',
            '#ff6f61'
          )}
          
          {renderSettingItem(
            'Email Notifications',
            'Receive notifications via email',
            settings.emailNotifications,
            (value) => handleToggle('emailNotifications', value),
            'email',
            '#4caf50'
          )}
        </View>

        {/* Message Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Messages & Activity</Text>
          
          {renderSettingItem(
            'Message Notifications',
            'Get notified of new messages and inquiries',
            settings.messageNotifications,
            (value) => handleToggle('messageNotifications', value),
            'message-text',
            '#2f95dc'
          )}
          
          {renderSettingItem(
            'Offer Notifications',
            'Get notified of price offers and swap requests',
            settings.offerNotifications,
            (value) => handleToggle('offerNotifications', value),
            'currency-usd',
            '#4caf50'
          )}
          
          {renderSettingItem(
            'Product Updates',
            'Notifications about likes, views, and product activity',
            settings.productUpdates,
            (value) => handleToggle('productUpdates', value),
            'heart',
            '#e91e63'
          )}
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <Text style={styles.sectionSubtitle}>
            Pause non-urgent notifications during specific hours
          </Text>
          
          {renderSettingItem(
            'Enable Quiet Hours',
            'Reduce notifications during your preferred quiet time',
            settings.quietHours.enabled,
            (value) => handleToggle('quietHours.enabled', value),
            'sleep',
            '#9c27b0'
          )}
          
          {settings.quietHours.enabled && (
            <View style={styles.timeContainer}>
              {renderTimeSelector('Start Time', 'startTime', settings.quietHours.startTime)}
              {renderTimeSelector('End Time', 'endTime', settings.quietHours.endTime)}
              
              <View style={styles.quietHoursInfo}>
                <MaterialCommunityIcons name="information" size={16} color="#666" />
                <Text style={styles.quietHoursInfoText}>
                  Urgent notifications will still be delivered during quiet hours
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Test & Manage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test & Manage</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={testNotification}
            disabled={loading}
          >
            <MaterialCommunityIcons name="send" size={20} color="#2f95dc" />
            <Text style={styles.actionButtonText}>Send Test Notification</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AllNotifications')}
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color="#2f95dc" />
            <Text style={styles.actionButtonText}>View All Notifications</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips</Text>
          
          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="lightbulb" size={20} color="#ff9800" />
            <Text style={styles.tipText}>
              Keep message notifications enabled to respond quickly to buyer inquiries and increase your sales
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#4caf50" />
            <Text style={styles.tipText}>
              You can always change these settings later from your profile menu
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Time Modal */}
      <Modal
        visible={showTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Set {editingTime === 'startTime' ? 'Start' : 'End'} Time
              </Text>
              <TouchableOpacity
                onPress={() => setShowTimeModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.timeInputContainer}>
              <Text style={styles.timeInputLabel}>Time (24-hour format)</Text>
              <TextInput
                style={styles.timeInput}
                value={tempTime}
                onChangeText={setTempTime}
                placeholder="HH:MM (e.g., 22:00)"
                keyboardType="numeric"
                maxLength={5}
              />
              <Text style={styles.timeInputHint}>
                Use 24-hour format (00:00 - 23:59)
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowTimeModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  if (validateTime(tempTime)) {
                    handleTimeChange(editingTime, tempTime);
                  } else {
                    Alert.alert('Invalid Time', 'Please enter a valid time in HH:MM format');
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 12,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  timeContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    color: '#2f95dc',
    fontWeight: '600',
    marginRight: 8,
  },
  disabledText: {
    color: '#ccc',
  },
  quietHoursInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  quietHoursInfoText: {
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    flex: 1,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  timeInputContainer: {
    padding: 20,
  },
  timeInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  timeInputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#2f95dc',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});