// frontend/src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../constants/config';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotifications = () => {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Push notifications need to be enabled to receive seller alerts and messages.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Settings', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return null;
      }

      // Get push token
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;

      console.log('Expo Push Token:', token);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('revomart_notifications', {
          name: 'RevoMart Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2f95dc',
          sound: 'default',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }, []);

  // Send FCM token to backend
  const updateFCMToken = useCallback(async (token) => {
    if (!user || !token) return;

    try {
      const authToken = await user.getIdToken();
      
      await fetch(`${API_URL}/api/notifications/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          token: token,
          deviceType: Platform.OS,
          deviceId: Constants.deviceId || Constants.installationId
        })
      });

      console.log('FCM token updated successfully');
    } catch (error) {
      console.error('Error updating FCM token:', error);
    }
  }, [user]);

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async (page = 1, limit = 20) => {
    if (!user) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      const response = await fetch(
        `${API_URL}/api/notifications?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        if (page === 1) {
          setNotifications(data.data.notifications);
        } else {
          setNotifications(prev => [...prev, ...data.data.notifications]);
        }
        setUnreadCount(data.data.unreadCount);
        
        // Update badge count
        await Notifications.setBadgeCountAsync(data.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setUnreadCount(data.unreadCount);
        await Notifications.setBadgeCountAsync(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds = [], markAll = false) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/notifications/mark-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notificationIds,
          markAll
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        if (markAll) {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          setUnreadCount(0);
          await Notifications.setBadgeCountAsync(0);
        } else {
          setNotifications(prev => 
            prev.map(n => 
              notificationIds.includes(n._id) ? { ...n, isRead: true } : n
            )
          );
          setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
          await Notifications.setBadgeCountAsync(Math.max(0, unreadCount - notificationIds.length));
        }
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [user, unreadCount]);

  // Handle notification received while app is running
  const handleNotificationReceived = useCallback((notification) => {
    console.log('Notification received:', notification);
    
    // Add to local notifications list
    const newNotification = {
      _id: notification.request.content.data?.notificationId || Date.now().toString(),
      title: notification.request.content.title,
      message: notification.request.content.body,
      type: notification.request.content.data?.type || 'general',
      data: notification.request.content.data || {},
      createdAt: new Date().toISOString(),
      isRead: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  // Handle notification tapped
  const handleNotificationResponse = useCallback((response) => {
    console.log('Notification tapped:', response);
    
    const data = response.notification.request.content.data;
    
    if (data) {
      // Handle navigation based on notification type
      // This should be handled by the navigation context
      return {
        type: data.type,
        conversationId: data.conversationId,
        productId: data.productId,
        notificationId: data.notificationId
      };
    }
    
    return null;
  }, []);

  // Initialize notifications when user is available
  useEffect(() => {
    if (!user) return;

    const initializeNotifications = async () => {
      // Register for push notifications
      const token = await registerForPushNotifications();
      if (token) {
        setExpoPushToken(token);
        await updateFCMToken(token);
      }

      // Fetch initial notifications and unread count
      await fetchNotifications();
      await fetchUnreadCount();
    };

    initializeNotifications();
  }, [user, registerForPushNotifications, updateFCMToken, fetchNotifications, fetchUnreadCount]);

  // Set up notification listeners
  useEffect(() => {
    // Listener for notifications received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(
      handleNotificationReceived
    );

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // App state change listener to fetch notifications when app becomes active
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && user) {
        fetchUnreadCount();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      notificationListener && Notifications.removeNotificationSubscription(notificationListener);
      responseListener && Notifications.removeNotificationSubscription(responseListener);
      appStateSubscription?.remove();
    };
  }, [user, handleNotificationReceived, handleNotificationResponse, fetchUnreadCount]);

  // Update notification settings
  const updateSettings = useCallback(async (settings) => {
    if (!user) return false;

    try {
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/notifications/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  }, [user]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!user) return false;

    try {
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test notification from RevoMart!'
        })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }, [user]);

  // Clear all notifications
  const clearNotifications = useCallback(async () => {
    await Notifications.setBadgeCountAsync(0);
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    expoPushToken,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    updateSettings,
    sendTestNotification,
    clearNotifications,
    handleNotificationResponse
  };
};