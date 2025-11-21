// frontend/src/screens/Chat/ChatListScreen.js - FIXED VERSION
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  TextInput,
  Animated,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  LayoutAnimation,
  UIManager,
  Pressable,
  Modal,
  ScrollView,
  Switch,
  Vibration
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";
import Layout from "../../components/Layouts";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { RectButton } from "react-native-gesture-handler";
import io from "socket.io-client";
import { debounce } from "lodash";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const ANIMATION_CONFIG = {
  duration: 300,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
};

// Advanced Filters Modal Component
const AdvancedFiltersModal = ({ filters, onFiltersChange, onClose, onApply }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const updateFilter = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Advanced Filters</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#1A1A1C" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent}>
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Content Type</Text>
          
          <View style={styles.filterOption}>
            <View>
              <Text style={styles.filterLabel}>Unread Only</Text>
              <Text style={styles.filterDescription}>Show only conversations with unread messages</Text>
            </View>
            <Switch
              value={localFilters.unreadOnly}
              onValueChange={(value) => updateFilter('unreadOnly', value)}
              trackColor={{ false: '#E0E6E3', true: '#2F6F61' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.filterOption}>
            <View>
              <Text style={styles.filterLabel}>With Media</Text>
              <Text style={styles.filterDescription}>Show conversations with photos or videos</Text>
            </View>
            <Switch
              value={localFilters.withMedia}
              onValueChange={(value) => updateFilter('withMedia', value)}
              trackColor={{ false: '#E0E6E3', true: '#2F6F61' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.filterOption}>
            <View>
              <Text style={styles.filterLabel}>With Products</Text>
              <Text style={styles.filterDescription}>Show conversations about products</Text>
            </View>
            <Switch
              value={localFilters.withProducts}
              onValueChange={(value) => updateFilter('withProducts', value)}
              trackColor={{ false: '#E0E6E3', true: '#2F6F61' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Time Range</Text>
          {['all', 'today', 'week', 'month'].map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.radioOption,
                localFilters.dateRange === range && styles.radioOptionSelected
              ]}
              onPress={() => updateFilter('dateRange', range)}
            >
              <View style={styles.radioCircle}>
                {localFilters.dateRange === range && <View style={styles.radioInner} />}
              </View>
              <Text style={[
                styles.radioLabel,
                localFilters.dateRange === range && styles.radioLabelSelected
              ]}>
                {range === 'all' && 'All Time'}
                {range === 'today' && 'Today'}
                {range === 'week' && 'Past Week'}
                {range === 'month' && 'Past Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Sort By</Text>
          {['recent', 'unread', 'alphabetical'].map((sort) => (
            <TouchableOpacity
              key={sort}
              style={[
                styles.radioOption,
                localFilters.sortBy === sort && styles.radioOptionSelected
              ]}
              onPress={() => updateFilter('sortBy', sort)}
            >
              <View style={styles.radioCircle}>
                {localFilters.sortBy === sort && <View style={styles.radioInner} />}
              </View>
              <Text style={[
                styles.radioLabel,
                localFilters.sortBy === sort && styles.radioLabelSelected
              ]}>
                {sort === 'recent' && 'Most Recent'}
                {sort === 'unread' && 'Unread First'}
                {sort === 'alphabetical' && 'Alphabetical'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => setLocalFilters({
            unreadOnly: false,
            withMedia: false,
            withProducts: false,
            dateRange: 'all',
            sortBy: 'recent'
          })}
        >
          <Text style={styles.secondaryButtonText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => {
            onFiltersChange(localFilters);
            onApply();
          }}
        >
          <Text style={styles.primaryButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Filter Button Component
const FilterButton = React.memo(({ label, filter, icon, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterBtn, active && styles.filterBtnActive]}
    onPress={() => onPress(filter)}
    activeOpacity={0.7}
  >
    <MaterialCommunityIcons 
      name={icon} 
      size={16} 
      color={active ? "#FFFFFF" : "#2F6F61"} 
    />
    <Text style={[styles.filterText, active && styles.filterTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
));

export default function ChatListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const [conversations, setConversations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    unreadOnly: false,
    withMedia: false,
    withProducts: false,
    dateRange: 'all',
    sortBy: 'recent'
  });
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [searchFocused, setSearchFocused] = useState(false);
  const [newMessagePulse, setNewMessagePulse] = useState(null);

  const swipeableRefs = useRef(new Map());
  const socketRef = useRef(null);
  const listRef = useRef(null);
  const searchInputRef = useRef(null);
  const lastMessageTime = useRef({});

  const connectionConfig = {
    connected: { 
      color: "#4CAF50", 
      text: "Live • Real-time updates", 
      icon: "wifi-strength-4",
    },
    connecting: { 
      color: "#FF9500", 
      text: "Connecting...", 
      icon: "wifi-strength-2",
    },
    disconnected: { 
      color: "#FF3B30", 
      text: "Reconnecting...", 
      icon: "wifi-strength-1",
    },
    error: { 
      color: "#FF3B30", 
      text: "Connection failed", 
      icon: "wifi-off",
    }
  };

  // Socket.IO initialization
  useEffect(() => {
    const initSocket = async () => {
      try {
        setConnectionStatus("connecting");
        
        const token = await user?.getIdToken?.();
        
        if (!token) {
          setConnectionStatus("error");
          return;
        }

        socketRef.current = io(API_URL, {
          transports: ['websocket', 'polling'],
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
          console.log('🚀 ChatList socket connected');
          setIsConnected(true);
          setConnectionStatus("connected");
        });

        socket.on('disconnect', (reason) => {
          console.log('❌ Socket disconnected:', reason);
          setIsConnected(false);
          setConnectionStatus("disconnected");
        });

        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setConnectionStatus("error");
        });

        socket.on('reconnect_attempt', () => {
          setConnectionStatus("connecting");
        });

        socket.on('reconnect_failed', () => {
          setConnectionStatus("error");
        });

        socket.on('newMessage', (message) => {
          handleNewMessage(message);
          if (Platform.OS === 'android') {
            Vibration.vibrate(50);
          }
        });

        socket.on('conversationUpdated', ({ conversationId, update }) => {
          handleConversationUpdate(conversationId, update);
        });

        socket.on('messageDeleted', ({ conversationId }) => {
          handleMessageDeletion(conversationId);
        });

        socket.on('messagesRead', ({ conversationId, messageIds }) => {
          handleMessagesRead(conversationId, messageIds);
        });

        socket.on('conversationCreated', (conversation) => {
          handleNewConversation(conversation);
        });

        socket.on('userTyping', ({ conversationId, userId, isTyping, username }) => {
          handleUserTyping(conversationId, userId, isTyping, username);
        });

        socket.on('userOnlineStatus', ({ userId, isOnline }) => {
          handleUserOnlineStatus(userId, isOnline);
        });

        socket.on('newUnreadCount', ({ conversationId, unreadCount }) => {
          updateUnreadCount(conversationId, unreadCount);
        });

        socket.on('conversationDeleted', ({ conversationId }) => {
          handleConversationDeleted(conversationId);
        });

      } catch (error) {
        console.error('Socket initialization error:', error);
        setConnectionStatus("error");
      }
    };

    if (user) {
      initSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  const handleNewMessage = useCallback((message) => {
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    
    setConversations(prev => {
      const now = Date.now();
      const conversationId = message.conversationId;
      
      if (lastMessageTime.current[conversationId] && 
          now - lastMessageTime.current[conversationId] < 500) {
        return prev;
      }
      lastMessageTime.current[conversationId] = now;

      const existingConvIndex = prev.findIndex(conv => 
        conv._id === conversationId
      );

      if (existingConvIndex !== -1) {
        const updated = [...prev];
        const existingConv = updated[existingConvIndex];
        
        const updatedConv = {
          ...existingConv,
          lastMessage: {
            content: message.content,
            senderId: message.senderId,
            messageType: message.messageType,
            sentDate: message.sentDate,
            _id: message._id
          },
          unreadCount: message.receiverId?._id === user?.uid ? 
            (existingConv.unreadCount || 0) + 1 : existingConv.unreadCount,
          updatedAt: message.sentDate || new Date().toISOString(),
          hasUnread: message.receiverId?._id === user?.uid
        };

        updated[existingConvIndex] = updatedConv;
        const [movedConv] = updated.splice(existingConvIndex, 1);
        return [movedConv, ...updated];
      } else {
        setTimeout(() => fetchConvs(true), 100);
        return prev;
      }
    });

    setNewMessagePulse(message.conversationId);
    setTimeout(() => setNewMessagePulse(null), 2000);
  }, [user]);

  const handleUserTyping = useCallback((conversationId, userId, isTyping, username) => {
    setTypingUsers(prev => ({
      ...prev,
      [conversationId]: isTyping ? { userId, username } : null
    }));
  }, []);

  const handleUserOnlineStatus = useCallback((userId, isOnline) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      if (isOnline) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, []);

  const updateUnreadCount = useCallback((conversationId, unreadCount) => {
    setConversations(prev => prev.map(conv => 
      conv._id === conversationId ? { ...conv, unreadCount } : conv
    ));
  }, []);

  const handleConversationUpdate = useCallback((conversationId, update) => {
    setConversations(prev => prev.map(conv => 
      conv._id === conversationId ? { ...conv, ...update } : conv
    ));
  }, []);

  const handleNewConversation = useCallback((conversation) => {
    setConversations(prev => {
      const exists = prev.find(conv => conv._id === conversation._id);
      if (!exists) {
        return [conversation, ...prev];
      }
      return prev;
    });
  }, []);

  const handleMessagesRead = useCallback((conversationId, messageIds) => {
    setConversations(prev => prev.map(conv => {
      if (conv._id === conversationId) {
        return {
          ...conv,
          unreadCount: Math.max(0, (conv.unreadCount || 0) - messageIds.length)
        };
      }
      return conv;
    }));
  }, []);

  const handleMessageDeletion = useCallback(() => {
    fetchConvs(true);
  }, []);

  const handleConversationDeleted = useCallback((conversationId) => {
    console.log('🗑️ Conversation deleted:', conversationId);
    setConversations(prev => prev.filter(conv => conv._id !== conversationId));
  }, []);

  const fetchConvs = useCallback(async (silent = false, loadMore = false) => {
    if (!user) return;

    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else if (!silent) {
        setIsLoading(true);
        LayoutAnimation.configureNext(ANIMATION_CONFIG);
      }

      const token = await user.getIdToken();
      const queryParams = new URLSearchParams({
        page: loadMore ? page + 1 : 1,
        limit: '25',
        sort: 'updatedAt:desc'
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch(`${API_URL}/api/messages/conversations?${queryParams}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const data = await resp.json();
      
      if (resp.ok) {
        const conversationsData = data.conversations || [];
        
        if (loadMore) {
          setConversations(prev => {
            const merged = [...prev, ...conversationsData];
            const unique = merged.reduce((acc, current) => {
              if (!acc.find(item => item._id === current._id)) {
                acc.push(current);
              }
              return acc;
            }, []);
            return unique;
          });
          setPage(prev => prev + 1);
          setHasMore(conversationsData.length >= 25);
        } else {
          setConversations(conversationsData);
          setPage(1);
          setHasMore(data.hasMore || false);
        }
      }
    } catch (err) {
      if (!silent && err.name !== 'AbortError') {
        Alert.alert("Connection Error", "Unable to load conversations.");
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setRefreshing(false);
    }
  }, [user, page]);

  const debouncedSearch = useRef(
    debounce((query, convos, filter, advFilters) => {
      applyFilters(convos, filter, query, advFilters);
    }, 400)
  ).current;

  const applyFilters = useCallback((convos, filter, query, advFilters) => {
    let filteredList = [...convos];
    
    // Quick filter
    switch (filter) {
      case "unread":
        filteredList = filteredList.filter(conv => conv.unreadCount > 0);
        break;
      case "groups":
        filteredList = filteredList.filter(conv => conv.isGroupChat);
        break;
      default:
        break;
    }

    // Advanced filters
    if (advFilters.unreadOnly) {
      filteredList = filteredList.filter(conv => conv.unreadCount > 0);
    }
    if (advFilters.withMedia) {
      filteredList = filteredList.filter(conv => 
        conv.lastMessage?.messageType === 'image' || 
        conv.lastMessage?.messageType === 'video'
      );
    }
    if (advFilters.withProducts) {
      filteredList = filteredList.filter(conv => conv.product != null);
    }

    // Date range filter
    const now = new Date();
    switch (advFilters.dateRange) {
      case 'today':
        filteredList = filteredList.filter(conv => {
          const convDate = new Date(conv.updatedAt);
          return convDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        filteredList = filteredList.filter(conv => new Date(conv.updatedAt) > weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        filteredList = filteredList.filter(conv => new Date(conv.updatedAt) > monthAgo);
        break;
    }

    // Search query filter
    if (query.trim()) {
      const lower = query.toLowerCase();
      filteredList = filteredList.filter(conv => {
        const usernameMatch = conv.otherUser?.username?.toLowerCase().includes(lower);
        const productMatch = conv.product?.title?.toLowerCase().includes(lower);
        const lastMessageMatch = conv.lastMessage?.content?.toLowerCase().includes(lower);
        
        return usernameMatch || productMatch || lastMessageMatch;
      });
    }

    // Sort in real-time
    switch (advFilters.sortBy) {
      case 'recent':
        filteredList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        break;
      case 'unread':
        filteredList.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
        break;
      case 'alphabetical':
        filteredList.sort((a, b) => 
          (a.otherUser?.username || '').localeCompare(b.otherUser?.username || '')
        );
        break;
    }
    
    setFiltered(filteredList);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setIsSelectionMode(prev => !prev);
    setSelectedConversations(new Set());
  }, []);

  const toggleConversationSelection = useCallback((conversationId) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  }, []);

  const selectAllConversations = useCallback(() => {
    setSelectedConversations(new Set(filtered.map(conv => conv._id)));
  }, [filtered]);

  // 🔧 FIX #3: Simplified delete function
  const performBulkDelete = useCallback(async () => {
    try {
      const token = await user.getIdToken();
      const conversationIds = Array.from(selectedConversations);
      
      // Optimistic update
      setConversations(prev => prev.filter(conv => !selectedConversations.has(conv._id)));
      
      const response = await fetch(`${API_URL}/api/messages/conversations/bulk-delete`, {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationIds })
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversations');
      }

      // Emit socket event to notify other devices
      if (socketRef.current) {
        conversationIds.forEach(id => {
          socketRef.current.emit('conversationDeleted', { conversationId: id });
        });
      }

      setSelectedConversations(new Set());
      setIsSelectionMode(false);
    } catch (err) {
      console.error('Delete error:', err);
      fetchConvs(true);
      Alert.alert("Error", "Failed to delete conversations");
    }
  }, [selectedConversations, user]);

  const formatTime = useCallback((dateString) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      ...(date.getFullYear() !== now.getFullYear() && { year: "2-digit" })
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConvs();
      
      return () => {
        swipeableRefs.current.forEach(ref => ref?.close());
        setSearchQuery("");
        setActiveFilter("all");
      };
    }, [user])
  );

  useEffect(() => {
    applyFilters(conversations, activeFilter, searchQuery, advancedFilters);
  }, [conversations, activeFilter, searchQuery, advancedFilters, applyFilters]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConvs(true);
  }, []);

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
  }, []);

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
    Keyboard.dismiss();
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchConvs(true, true);
    }
  }, [isLoadingMore, hasMore]);

  // 🔧 FIX #3: Fixed swipe delete action with immediate alert
  const renderRightActions = useCallback((progress, dragX, item) => {
    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActions}>
        <Animated.View style={[styles.swipeActionWrapper, { transform: [{ translateX }] }]}>
          <RectButton 
            style={[styles.swipeAction, styles.deleteAction]}
            onPress={() => {
              const ref = swipeableRefs.current.get(item._id);
              if (ref) {
                ref.close();
              }
              // Use setTimeout to ensure swipe closes before alert shows
              setTimeout(() => {
                setSelectedConversations(new Set([item._id]));
                Alert.alert(
                  'Delete Conversation',
                  "This action cannot be undone. The conversation will be permanently deleted.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Delete", 
                      style: "destructive",
                      onPress: async () => {
                        await performBulkDelete();
                      }
                    }
                  ]
                );
              }, 300);
            }}
          >
            <MaterialCommunityIcons name="delete" size={24} color="#FFFFFF" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </RectButton>
        </Animated.View>
      </View>
    );
  }, [performBulkDelete]);

  const TypingIndicator = ({ conversationId }) => {
    const typingData = typingUsers[conversationId];
    if (!typingData) return null;

    return (
      <Text style={styles.typingText}>
        {typingData.username} is typing...
      </Text>
    );
  };

  const OnlineIndicator = () => (
    <View style={styles.onlineIndicator}>
      <View style={styles.onlinePulse} />
    </View>
  );

  const renderItem = useCallback(({ item }) => {
    const isSelected = selectedConversations.has(item._id);
    const isUnread = item.unreadCount > 0;
    const isOnline = onlineUsers.has(item.otherUser?._id);
    const isTyping = typingUsers[item._id];
    const hasPulse = newMessagePulse === item._id;

    const preview = () => {
      if (isTyping) return <TypingIndicator conversationId={item._id} />;
      if (!item.lastMessage) return "Start a conversation";
      
      const type = item.lastMessage.messageType;
      if (type === "image") return "📷 Photo";
      if (type === "video") return "🎥 Video";
      if (type === "product") return "🛍️ Product shared";
      if (type === "call") return "📞 Voice call";
      if (type === "system") return "🔔 System message";
      
      return item.lastMessage.content?.substring(0, 50) + 
        (item.lastMessage.content?.length > 50 ? "..." : "") || "New message";
    };

    return (
      <Animated.View
        style={[
          styles.conversationContainer,
          hasPulse && styles.pulseContainer,
          isSelected && styles.selectedContainer
        ]}
      >
        {isSelectionMode ? (
          <Pressable
            style={[styles.card, isSelected && styles.selectedCard]}
            onPress={() => toggleConversationSelection(item._id)}
            onLongPress={toggleSelectionMode}
            delayLongPress={300}
          >
            <View style={styles.selectionCheckbox}>
              <MaterialCommunityIcons 
                name={isSelected ? "check-circle" : "circle-outline"} 
                size={24} 
                color={isSelected ? "#2F6F61" : "#C7C7CC"} 
              />
            </View>
            
            <View style={styles.avatarContainer}>
              {item.otherUser?.profilePictureUrl ? (
                <Image
                  source={{ uri: item.otherUser.profilePictureUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.placeholderAvatar}>
                  <Text style={styles.placeholderInitial}>
                    {item.otherUser?.username?.charAt(0)?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
              {isUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.content}>
              <Text style={styles.username} numberOfLines={1}>
                {item.otherUser?.username || "Unknown User"}
              </Text>
              <Text style={styles.messageText} numberOfLines={1}>
                {preview()}
              </Text>
            </View>
          </Pressable>
        ) : (
          <Swipeable
            ref={ref => swipeableRefs.current.set(item._id, ref)}
            renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
            rightThreshold={40}
            friction={2}
            overshootFriction={8}
          >
            <Pressable
              style={[
                styles.card,
                isUnread && styles.unreadCard,
              ]}
              onPress={() => {
                navigation.navigate("Chat", { 
                  conversation: item, 
                  otherUser: item.otherUser,
                  product: item.product 
                });
              }}
              onLongPress={toggleSelectionMode}
              delayLongPress={500}
              android_ripple={{ color: 'rgba(47, 111, 97, 0.1)' }}
            >
              <View style={styles.avatarContainer}>
                {item.otherUser?.profilePictureUrl ? (
                  <Image
                    source={{ uri: item.otherUser.profilePictureUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.placeholderAvatar}>
                    <Text style={styles.placeholderInitial}>
                      {item.otherUser?.username?.charAt(0)?.toUpperCase() || "U"}
                    </Text>
                  </View>
                )}
                {isOnline && <OnlineIndicator />}
                {isUnread && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {item.unreadCount > 99 ? '99+' : item.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.content}>
                <View style={styles.headerRow}>
                  <Text style={[styles.username, isUnread && styles.unreadText]} numberOfLines={1}>
                    {item.otherUser?.username || "Unknown User"}
                    {item.isGroupChat && " 👥"}
                  </Text>
                  <View style={styles.headerRight}>
                    {item.lastMessage && (
                      <Text style={[styles.time, isUnread && styles.unreadTime]}>
                        {formatTime(item.lastMessage.sentDate || item.updatedAt)}
                      </Text>
                    )}
                  </View>
                </View>
                
                {item.product && (
                  <Text style={styles.aboutText} numberOfLines={1}>
                    💬 About: {item.product.title}
                  </Text>
                )}
                
                <View style={styles.messageRow}>
                  <Text 
                    style={[
                      styles.messageText, 
                      isUnread && styles.unreadText,
                      isTyping && styles.typingMessageText
                    ]} 
                    numberOfLines={1}
                  >
                    {preview()}
                  </Text>
                  {item.lastMessage?.messageType === "image" && (
                    <MaterialCommunityIcons name="image" size={16} color="#8E8E93" />
                  )}
                </View>
              </View>

              {item.product?.imagesUrls?.[0] && (
                <Image
                  source={{ uri: item.product.imagesUrls[0] }}
                  style={styles.productThumb}
                />
              )}

              <MaterialCommunityIcons 
                name="chevron-right" 
                size={20} 
                color="#C7C7CC" 
                style={styles.chevron}
              />
            </Pressable>
          </Swipeable>
        )}
      </Animated.View>
    );
  }, [
    selectedConversations, 
    onlineUsers, 
    typingUsers, 
    newMessagePulse, 
    isSelectionMode,
    navigation,
    toggleConversationSelection,
    toggleSelectionMode,
    formatTime,
    renderRightActions
  ]);

  const currentStatus = connectionConfig[connectionStatus];

  return (
    <Layout>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7F6" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {isSelectionMode ? (
            <View style={styles.selectionHeader}>
              <TouchableOpacity onPress={toggleSelectionMode} style={styles.headerButton}>
                <MaterialCommunityIcons name="close" size={24} color="#1A1A1C" />
              </TouchableOpacity>
              <Text style={styles.selectionTitle}>
                {selectedConversations.size} selected
              </Text>
              <View style={styles.selectionActions}>
                <TouchableOpacity onPress={selectAllConversations} style={styles.headerButton}>
                  <MaterialCommunityIcons name="select-all" size={24} color="#2F6F61" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    Alert.alert(
                      `Delete ${selectedConversations.size} Conversation${selectedConversations.size > 1 ? 's' : ''}`,
                      "This action cannot be undone. The conversation will be permanently deleted.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { 
                          text: "Delete", 
                          style: "destructive",
                          onPress: performBulkDelete
                        }
                      ]
                    );
                  }} 
                  style={styles.headerButton}
                >
                  <MaterialCommunityIcons name="delete" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View>
                <Text style={styles.pageTitle}>Messages</Text>
                <Text style={styles.subtitle}>Connect with buyers & sellers</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={() => setShowFiltersModal(true)} style={styles.headerButton}>
                  <MaterialCommunityIcons name="filter-variant" size={24} color="#2F6F61" />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleSelectionMode} style={styles.headerButton}>
                  <MaterialCommunityIcons name="select" size={24} color="#2F6F61" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={[styles.statusContainer, { backgroundColor: currentStatus.color }]}>
          <MaterialCommunityIcons 
            name={currentStatus.icon} 
            size={16} 
            color="#FFFFFF" 
          />
          <Text style={styles.statusText}>
            {currentStatus.text}
          </Text>
          {connectionStatus === "error" && (
            <TouchableOpacity onPress={() => fetchConvs()}>
              <Text style={styles.retryText}>RETRY</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.searchSection, searchFocused && styles.searchSectionFocused]}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          <FilterButton 
            label="All" 
            filter="all" 
            icon="message-text" 
            active={activeFilter === "all"}
            onPress={handleFilterChange}
          />
          <FilterButton 
            label="Unread" 
            filter="unread" 
            icon="message-badge" 
            active={activeFilter === "unread"}
            onPress={handleFilterChange}
          />
          <FilterButton 
            label="Groups" 
            filter="groups" 
            icon="account-group" 
            active={activeFilter === "groups"}
            onPress={handleFilterChange}
          />
        </ScrollView>
      </View>

      <View style={styles.listContainer}>
        {isLoading && filtered.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2F6F61" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={filtered}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={["#2F6F61"]}
                tintColor="#2F6F61"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="message-outline" size={80} color="#E0E6E3" />
                <Text style={styles.emptyTitle}>
                  {searchQuery || activeFilter !== "all" ? "No matches found" : "No conversations yet"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery || activeFilter !== "all" 
                    ? "Try adjusting your search or filter" 
                    : "Start chatting by messaging sellers"}
                </Text>
                {(searchQuery || activeFilter !== "all") && (
                  <TouchableOpacity 
                    style={styles.resetButton}
                    onPress={() => {
                      setSearchQuery("");
                      setActiveFilter("all");
                    }}
                  >
                    <Text style={styles.resetButtonText}>Show all</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.footer}>
                  <ActivityIndicator size="large" color="#2F6F61" />
                </View>
              ) : null
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal
        visible={showFiltersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <AdvancedFiltersModal
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
          onClose={() => setShowFiltersModal(false)}
          onApply={() => {
            setShowFiltersModal(false);
          }}
        />
      </Modal>

      {isSelectionMode && selectedConversations.size > 0 && (
        <TouchableOpacity
          style={[styles.fab, styles.deleteFab]}
          onPress={() => {
            Alert.alert(
              `Delete ${selectedConversations.size} Conversation${selectedConversations.size > 1 ? 's' : ''}`,
              "This action cannot be undone. The conversation will be permanently deleted.",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Delete", 
                  style: "destructive",
                  onPress: performBulkDelete
                }
              ]
            );
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="delete" size={24} color="#FFFFFF" />
          <Text style={styles.fabText}>{selectedConversations.size}</Text>
        </TouchableOpacity>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#F5F7F6',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1A1A1C",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1C',
    flex: 1,
    textAlign: 'center',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F5F7F6',
  },
  searchSectionFocused: {
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1A1A1C",
    fontWeight: "500",
  },
  filterContainer: {
    flexDirection: "row",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: "#2F6F61",
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#2F6F61",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#F5F7F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 100,
    flexGrow: 1,
  },
  conversationContainer: {
    marginVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  pulseContainer: {
    backgroundColor: 'rgba(47, 111, 97, 0.05)',
  },
  selectedContainer: {
    backgroundColor: 'rgba(47, 111, 97, 0.1)',
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    minHeight: 90,
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedCard: {
    backgroundColor: 'rgba(47, 111, 97, 0.05)',
    borderLeftColor: '#2F6F61',
  },
  unreadCard: {
    borderLeftColor: "#2F6F61",
    backgroundColor: "#F8FFFD",
  },
  selectionCheckbox: {
    marginRight: 12,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#E0E6E3",
  },
  placeholderAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#2F6F61',
  },
  placeholderInitial: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  onlinePulse: {
    width: '100%',
    height: '100%',
    borderRadius: 7,
    backgroundColor: '#4CAF50',
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF3B30",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1A1A1C",
    flex: 1,
  },
  unreadText: {
    fontWeight: "700",
    color: "#1A1A1C",
  },
  time: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "500",
  },
  unreadTime: {
    color: "#2F6F61",
    fontWeight: "600",
  },
  aboutText: {
    fontSize: 14,
    color: "#2F6F61",
    fontWeight: "500",
    marginBottom: 2,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageText: {
    fontSize: 15,
    color: "#8E8E93",
    flex: 1,
    marginRight: 8,
  },
  typingMessageText: {
    color: '#2F6F61',
    fontWeight: '500',
  },
  typingText: {
    fontSize: 14,
    color: '#2F6F61',
    fontStyle: 'italic',
  },
  productThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  chevron: {
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1C",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  resetButton: {
    marginTop: 20,
    backgroundColor: "#2F6F61",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  swipeActions: {
    flexDirection: "row",
    width: 80,
    height: "85%",
    marginVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  swipeActionWrapper: {
    flex: 1,
  },
  swipeAction: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  deleteAction: {
    backgroundColor: "#FF3B30",
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteFab: {
    backgroundColor: '#FF3B30',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    position: 'absolute',
    top: 8,
    right: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F7F6',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6E3',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1C',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 30,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1C',
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1C',
    marginBottom: 4,
  },
  filterDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  radioOptionSelected: {
    backgroundColor: 'rgba(47, 111, 97, 0.05)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2F6F61',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2F6F61',
  },
  radioLabel: {
    fontSize: 16,
    color: '#1A1A1C',
  },
  radioLabelSelected: {
    fontWeight: '600',
    color: '#2F6F61',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E6E3',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2F6F61',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E6E3',
  },
  secondaryButtonText: {
    color: '#2F6F61',
    fontSize: 16,
    fontWeight: '600',
  },
});