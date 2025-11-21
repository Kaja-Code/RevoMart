// frontend/src/screens/Chat/ChatScreen.js - FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StatusBar,
  ActivityIndicator,
  Animated
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';
import io from 'socket.io-client';

export default function ChatScreen() {
  const { user, userDetails } = useAuth();
  const route = useRoute();
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const socketRef = useRef(null);
  const isInitialLoad = useRef(true);
  const isUserScrolling = useRef(false);
  const messageIdsRef = useRef(new Set());

  const { conversation, otherUser } = route.params;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [inquiryClosed, setInquiryClosed] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Socket.IO
  useEffect(() => {
    const initSocket = async () => {
      try {
        if (userDetails?._id) {
          setCurrentUserId(userDetails._id);
        }

        const token = await user.getIdToken();
        
        socketRef.current = io(API_URL, {
          transports: ['websocket', 'polling'],
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        socketRef.current.on('connect', () => {
          console.log('✅ Chat socket connected');
          setIsConnected(true);
          socketRef.current.emit('joinConversation', conversation._id);
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('❌ Chat socket disconnected:', reason);
          setIsConnected(false);
        });

        socketRef.current.on('conversationJoined', ({ conversationId }) => {
          console.log('✅ Joined conversation:', conversationId);
        });

        // Handle new messages without duplicates
        socketRef.current.on('newMessage', (message) => {
          console.log('📨 New message received:', message._id);
          
          if (messageIdsRef.current.has(message._id)) {
            console.log('⚠️ Duplicate message ignored:', message._id);
            return;
          }

          messageIdsRef.current.add(message._id);
          
          setMessages(prev => {
            const exists = prev.some(m => m._id === message._id);
            if (exists) {
              console.log('⚠️ Message already in state:', message._id);
              return prev;
            }
            
            console.log('✅ Adding new message to state');
            
            if (isUserScrolling.current) {
              setNewMessagesCount(count => count + 1);
            }
            
            return [...prev, message];
          });
          
          if (!isUserScrolling.current || isInitialLoad.current) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        });

        socketRef.current.on('userTyping', ({ userId, isTyping: typing }) => {
          if (userId === otherUser._id) {
            setIsTyping(typing);
          }
        });

        socketRef.current.on('userOnlineStatus', ({ userId, isOnline: online }) => {
          if (userId === otherUser._id) {
            setIsOnline(online);
          }
        });

        socketRef.current.on('messageDelivered', ({ messageId }) => {
          setMessages(prev => prev.map(msg => 
            msg._id === messageId ? { ...msg, isDelivered: true, status: 'delivered' } : msg
          ));
        });

        socketRef.current.on('messagesRead', ({ messageIds }) => {
          setMessages(prev => prev.map(msg => 
            messageIds.includes(msg._id) ? { ...msg, isRead: true, status: 'read' } : msg
          ));
        });

        socketRef.current.on('messageDeleted', ({ messageId }) => {
          messageIdsRef.current.delete(messageId);
          setMessages(prev => prev.filter(msg => msg._id !== messageId));
        });

        socketRef.current.on('incomingCall', ({ callerId, callerName, callType, conversationId }) => {
          Alert.alert(
            'Incoming Call',
            `${callerName} is calling you`,
            [
              { 
                text: 'Decline', 
                onPress: () => socketRef.current.emit('callResponse', { 
                  conversationId, 
                  callerId, 
                  accepted: false 
                }),
                style: 'cancel' 
              },
              { 
                text: 'Accept', 
                onPress: () => socketRef.current.emit('callResponse', { 
                  conversationId, 
                  callerId, 
                  accepted: true 
                })
              }
            ]
          );
        });

        socketRef.current.on('callResponse', ({ accepted }) => {
          Alert.alert(
            'Call Response',
            accepted ? 'Call accepted!' : 'Call declined',
            [{ text: 'OK' }]
          );
        });

        socketRef.current.on('callEnded', () => {
          Alert.alert('Call Ended', 'The call has ended', [{ text: 'OK' }]);
        });

      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    if (user && userDetails) {
      initSocket();
      fetchMessages();
      markMessagesAsRead();
      setupNavigation();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveConversation', conversation._id);
        socketRef.current.disconnect();
      }
    };
  }, [user, userDetails]);

  // Typing indicator
  useEffect(() => {
    if (newMessage.trim() && socketRef.current) {
      socketRef.current.emit('typing', {
        conversationId: conversation._id,
        isTyping: true
      });
      
      const timer = setTimeout(() => {
        socketRef.current?.emit('typing', {
          conversationId: conversation._id,
          isTyping: false
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    } else if (socketRef.current) {
      socketRef.current.emit('typing', {
        conversationId: conversation._id,
        isTyping: false
      });
    }
  }, [newMessage]);

  // Handle scroll events
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    
    const isAtBottom = distanceFromBottom < 50;
    
    if (isAtBottom) {
      isUserScrolling.current = false;
      setShowScrollButton(false);
      setNewMessagesCount(0);
      
      if (messages.length > 0) {
        const unreadMessages = messages
          .filter(msg => !msg.isRead && msg.receiverId._id === currentUserId)
          .map(msg => msg._id);
        
        if (unreadMessages.length > 0 && socketRef.current) {
          socketRef.current.emit('messageRead', {
            conversationId: conversation._id,
            messageIds: unreadMessages
          });
        }
      }
    } else {
      isUserScrolling.current = true;
      setShowScrollButton(true);
    }
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setNewMessagesCount(0);
    setShowScrollButton(false);
    isUserScrolling.current = false;
  };

  const setupNavigation = () => {
    navigation.setOptions({
      title: '',
      headerStyle: { 
        backgroundColor: '#2F6F61',
        shadowColor: 'transparent',
        elevation: 0,
      },
      headerTintColor: '#fff',
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerButton}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
          <View style={styles.headerUserInfo}>
            <Text style={styles.headerUserName}>{otherUser.username}</Text>
            <Text style={styles.headerUserStatus}>
              {isTyping ? 'Typing...' : isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleVoiceCall} style={styles.headerIcon}>
            <MaterialCommunityIcons name="phone" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMore} style={styles.headerIcon}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/messages/conversations/${conversation._id}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (response.ok) {
        messageIdsRef.current.clear();
        data.messages.forEach(msg => messageIdsRef.current.add(msg._id));
        
        setMessages(data.messages || []);
        
        if (isInitialLoad.current && data.messages?.length > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
            isInitialLoad.current = false;
          }, 300);
        }
      } else {
        console.error('Error fetching messages:', data.error);
        Alert.alert('Error', 'Failed to load messages');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      const token = await user.getIdToken();
      await fetch(
        `${API_URL}/api/messages/conversations/${conversation._id}/mark-read`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const sendMessage = async (messageData) => {
    if (sending) return;

    try {
      setSending(true);
      const token = await user.getIdToken();

      const messagePayload = {
        conversationId: conversation._id,
        receiverId: otherUser._id,
        ...messageData,
        ...(replyTo && { replyTo: replyTo._id })
      };

      const response = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messagePayload),
      });

      const data = await response.json();
      if (response.ok) {
        messageIdsRef.current.add(data.message._id);
        
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        setReplyTo(null);
        
        if (socketRef.current) {
          socketRef.current.emit('sendMessage', {
            conversationId: conversation._id,
            message: data.message
          });
        }
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          isUserScrolling.current = false;
          setShowScrollButton(false);
        }, 100);
      } else {
        Alert.alert('Error', data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendText = () => {
    if (!newMessage.trim()) return;
    sendMessage({ content: newMessage.trim(), messageType: 'text' });
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAndSendImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image pick error:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAndSendImage = async (uri) => {
    try {
      setSending(true);
      const token = await user.getIdToken();

      const response = await fetch(uri);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result;
          
          const uploadResponse = await fetch(`${API_URL}/api/messages/upload-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ image: base64 }),
          });

          const uploadData = await uploadResponse.json();
          
          if (uploadResponse.ok && uploadData.imageUrl) {
            sendMessage({
              messageType: 'image',
              imageUrl: uploadData.imageUrl,
              content: '📷 Image',
            });
          } else {
            throw new Error(uploadData.error || 'Upload failed');
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Image processing error:', err);
      Alert.alert('Error', 'Failed to process image.');
    } finally {
      setSending(false);
    }
  };

  const handleVoiceCall = () => {
    Alert.alert(
      'Voice Call', 
      `Call ${otherUser.username}?`, 
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            if (socketRef.current) {
              socketRef.current.emit('callUser', {
                conversationId: conversation._id,
                callType: 'voice',
                receiverId: otherUser._id
              });
            }
            sendMessage({
              messageType: 'call',
              content: '📞 Voice call started',
              callType: 'voice',
              callDuration: 0,
            });
          },
        },
      ]
    );
  };

  const handleMore = () => {
    Alert.alert(
      'Chat Options',
      '',
      [
        { text: 'View Profile', onPress: () => {} },
        { text: 'Clear Chat', onPress: clearChat, style: 'destructive' },
        { text: 'Block User', onPress: blockUser, style: 'destructive' },
        ...(conversation.product && !inquiryClosed ? [{ text: 'Close Inquiry', onPress: closeInquiry, style: 'default' }] : []),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const closeInquiry = () => {
    Alert.alert(
      'Close Inquiry',
      'Are you sure you want to close this product inquiry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Close Inquiry', 
          onPress: () => {
            setInquiryClosed(true);
            Alert.alert('Success', 'Inquiry closed successfully');
            sendMessage({
              messageType: 'text',
              content: '🔒 Product inquiry has been closed',
            });
          }
        },
      ]
    );
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const token = await user.getIdToken();
              const response = await fetch(
                `${API_URL}/api/messages/conversations/${conversation._id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              
              if (response.ok) {
                messageIdsRef.current.clear();
                setMessages([]);
                Alert.alert('Success', 'Chat cleared successfully');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to clear chat');
            }
          }
        },
      ]
    );
  };

  const deleteMessage = async (messageId) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const token = await user.getIdToken();
              const response = await fetch(
                `${API_URL}/api/messages/${messageId}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              
              if (response.ok) {
                messageIdsRef.current.delete(messageId);
                setMessages(prev => prev.filter(msg => msg._id !== messageId));
                
                if (socketRef.current) {
                  socketRef.current.emit('deleteMessage', {
                    messageId,
                    conversationId: conversation._id
                  });
                }
                
                Alert.alert('Success', 'Message deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete message');
              }
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Error', 'Failed to delete message');
            }
          }
        },
      ]
    );
  };

  const blockUser = () => {
    Alert.alert(
      'Block User',
      `Block ${otherUser.username}? You won't receive messages from them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const shareProduct = () => {
    if (conversation.product) {
      sendMessage({
        messageType: 'product',
        content: `🛍️ ${conversation.product.title}`,
        sharedProduct: {
          productId: conversation.product._id,
          productTitle: conversation.product.title,
          productPrice: conversation.product.price,
          productImage: conversation.product.imagesUrls?.[0],
        },
      });
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const getMessageStatus = (message) => {
    if (message.isRead) return '✓✓ Read';
    if (message.isDelivered) return '✓✓ Delivered';
    return '✓ Sent';
  };

  const groupMessagesByDate = (messagesArray) => {
    const grouped = {};
    
    messagesArray.forEach(message => {
      const date = new Date(message.sentDate).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    return grouped;
  };

  const renderDateHeader = (date) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateHeaderText}>{formatDateHeader(date)}</Text>
    </View>
  );

  const renderReplySection = () => {
    if (!replyTo) return null;

    return (
      <View style={styles.replyContainer}>
        <View style={styles.replyIndicator}>
          <MaterialCommunityIcons name="reply" size={16} color="#2F6F61" />
          <Text style={styles.replyLabel}>
            Replying to {replyTo.senderId._id === currentUserId ? 'yourself' : otherUser.username}
          </Text>
        </View>
        <View style={styles.replyContent}>
          <Text style={styles.replyText} numberOfLines={2}>
            {replyTo.messageType === 'image' ? '📷 Photo' : replyTo.content}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyClose}>
          <MaterialCommunityIcons name="close" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    );
  };

  const SwipeToReply = ({ children, onReply }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    
    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = (event) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
        const { translationX } = event.nativeEvent;
        const threshold = 80;
        
        if (Math.abs(translationX) > threshold) {
          onReply();
        }
        
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    };

    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View style={{ transform: [{ translateX }] }}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    );
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId._id === currentUserId;

    return (
      <SwipeToReply onReply={() => setReplyTo(item)}>
        <View style={[
          styles.messageContainer, 
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}>
          <View style={styles.messageWrapper}>
            {item.replyTo && (
              <TouchableOpacity 
                style={[
                  styles.replyPreview,
                  isMyMessage ? styles.myReplyPreview : styles.otherReplyPreview
                ]}
                onPress={() => {
                  const repliedIndex = messages.findIndex(m => m._id === item.replyTo.messageId);
                  if (repliedIndex !== -1) {
                    flatListRef.current?.scrollToIndex({ index: repliedIndex, animated: true });
                  }
                }}
              >
                <View style={[
                  styles.replyPreviewBar,
                  isMyMessage ? styles.myReplyBar : styles.otherReplyBar
                ]} />
                <View style={styles.replyPreviewContent}>
                  <Text style={[
                    styles.replyPreviewName,
                    isMyMessage ? styles.myReplyName : styles.otherReplyName
                  ]}>
                    {item.replyTo.senderId._id === currentUserId ? 'You' : otherUser.username}
                  </Text>
                  <Text style={[
                    styles.replyPreviewText,
                    isMyMessage ? styles.myReplyText : styles.otherReplyText
                  ]} numberOfLines={1}>
                    {item.replyTo.messageType === 'image' ? '📷 Photo' : item.replyTo.content}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.messageBubble,
                isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
              ]}
              onLongPress={() => {
                const options = [
                  { 
                    text: 'Reply', 
                    onPress: () => setReplyTo(item) 
                  },
                ];

                if (isMyMessage) {
                  options.push({ 
                    text: 'Delete', 
                    style: 'destructive', 
                    onPress: () => deleteMessage(item._id)
                  });
                }

                options.push({ text: 'Cancel', style: 'cancel' });

                Alert.alert('Message Options', '', options);
              }}
            >
              {item.messageType === 'text' && (
                <Text style={[
                  styles.messageText, 
                  isMyMessage ? styles.myMessageText : styles.otherMessageText
                ]}>
                  {item.content}
                </Text>
              )}
              
              {item.messageType === 'image' && item.imageUrl && (
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedImage(item.imageUrl);
                    setImageModalVisible(true);
                  }}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
                  <View style={styles.imageOverlay}>
                    <MaterialCommunityIcons name="magnify-plus" size={20} color="white" />
                  </View>
                </TouchableOpacity>
              )}
              
              {item.messageType === 'product' && item.sharedProduct && (
                <TouchableOpacity
                  style={styles.productMessage}
                  onPress={() => {
                    if (item.sharedProduct.productId) {
                      navigation.navigate('ProductDetails', {
                        product: {
                          _id: item.sharedProduct.productId,
                          title: item.sharedProduct.productTitle,
                          price: item.sharedProduct.productPrice,
                          imagesUrls: [item.sharedProduct.productImage],
                        }
                      });
                    }
                  }}
                >
                  <Image
                    source={{ uri: item.sharedProduct.productImage }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>{item.sharedProduct.productTitle}</Text>
                    <Text style={styles.productPrice}>LKR {item.sharedProduct.productPrice?.toLocaleString()}</Text>
                    <Text style={styles.productLabel}>Tap to view product</Text>
                  </View>
                </TouchableOpacity>
              )}
              
              {item.messageType === 'call' && (
                <View style={styles.callMessage}>
                  <MaterialCommunityIcons
                    name={item.callType === 'video' ? 'video' : 'phone'}
                    size={16}
                    color={isMyMessage ? '#fff' : '#2F6F61'}
                  />
                  <Text style={[
                    styles.callText, 
                    isMyMessage ? styles.myMessageText : styles.otherMessageText
                  ]}>
                    {item.content}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            <View style={[
              styles.messageMeta, 
              isMyMessage ? styles.myMessageMeta : styles.otherMessageMeta
            ]}>
              <Text style={styles.messageTime}>{formatMessageTime(item.sentDate)}</Text>
              {isMyMessage && (
                <Text style={styles.messageStatus}>{getMessageStatus(item)}</Text>
              )}
            </View>
          </View>
        </View>
      </SwipeToReply>
    );
  };

  const groupedMessages = groupMessagesByDate(messages);
  const flattenedData = Object.entries(groupedMessages).map(([date, msgs]) => ({
    date,
    messages: msgs
  }));

  const renderItem = ({ item: dateGroup }) => (
    <View key={dateGroup.date}>
      {renderDateHeader(dateGroup.date)}
      {dateGroup.messages.map((message) => (
        <View key={message._id}>
          {renderMessage({ item: message })}
        </View>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#2F6F61" />
      
      {!isConnected && (
        <View style={styles.connectionBanner}>
          <MaterialCommunityIcons name="wifi-off" size={16} color="#FFF" />
          <Text style={styles.connectionText}>Connecting...</Text>
        </View>
      )}
      
      {conversation.product && !inquiryClosed && (
        <View style={styles.productHeader}>
          <TouchableOpacity
            style={styles.productHeaderContent}
            onPress={() => {
              navigation.navigate('ProductDetails', {
                product: conversation.product
              });
            }}
          >
            <Image
              source={{ uri: conversation.product.imagesUrls?.[0] }}
              style={styles.headerProductImage}
            />
            <View style={styles.headerProductInfo}>
              <Text style={styles.headerProductTitle}>{conversation.product.title}</Text>
              <Text style={styles.headerProductPrice}>LKR {conversation.product.price?.toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={shareProduct} style={styles.shareButton}>
              <MaterialCommunityIcons name="share-variant" size={20} color="#2F6F61" />
            </TouchableOpacity>
            <TouchableOpacity onPress={closeInquiry} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={flattenedData}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="message-outline" size={60} color="#E0E6E3" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>Start the conversation!</Text>
            </View>
          )
        }
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6F61" />
        </View>
      )}

      {showScrollButton && (
        <TouchableOpacity 
          style={styles.scrollToBottomButton}
          onPress={scrollToBottom}
        >
          <MaterialCommunityIcons name="chevron-down" size={24} color="#FFFFFF" />
          {newMessagesCount > 0 && (
            <View style={styles.newMessagesBadge}>
              <Text style={styles.newMessagesText}>
                {newMessagesCount > 99 ? '99+' : newMessagesCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {renderReplySection()}

      <View style={styles.inputContainer}>
        <TouchableOpacity 
          onPress={handleImagePicker} 
          style={styles.attachButton}
          disabled={sending}
        >
          <MaterialCommunityIcons name="image" size={24} color="#2F6F61" />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={1000}
          editable={!sending}
        />

        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendText}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setImageModalVisible(false)}
          >
            <Image source={{ uri: selectedImage }} style={styles.fullImage} />
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => setImageModalVisible(false)}
            >
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7F6",
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA726',
    paddingVertical: 6,
    gap: 8,
  },
  connectionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  headerUserInfo: {
    marginLeft: 8,
  },
  headerUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  headerUserStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: 8,
    marginLeft: 4,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#FFFFFF",
    margin: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerProductImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  headerProductInfo: {
    flex: 1,
  },
  headerProductTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1C",
    marginBottom: 2,
  },
  headerProductPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2F6F61",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  shareButton: {
    padding: 8,
    backgroundColor: "#F0F7F5",
    borderRadius: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    backgroundColor: '#E8F0EC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#2F6F61',
    fontWeight: '500',
  },
  messageContainer: {
    marginVertical: 4,
    width: '100%',
  },
  myMessage: {
    alignItems: "flex-end",
    alignSelf: 'flex-end',
    marginLeft: '20%',
  },
  otherMessage: {
    alignItems: "flex-start",
    alignSelf: 'flex-start',
    marginRight: '20%',
  },
  messageWrapper: {
    maxWidth: '100%',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 2,
  },
  myMessageBubble: {
    backgroundColor: "#2F6F61",
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#1A1A1C",
  },
  messageMeta: {
    flexDirection: "row",
    marginTop: 2,
    alignItems: 'center',
  },
  myMessageMeta: {
    justifyContent: "flex-end",
  },
  otherMessageMeta: {
    justifyContent: "flex-start",
  },
  messageTime: {
    fontSize: 11,
    color: "#8E8E93",
    marginRight: 4,
  },
  messageStatus: {
    fontSize: 10,
    color: "#8E8E93",
    fontStyle: 'italic',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productMessage: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 8,
    width: 200,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 8,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "inherit",
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "inherit",
    marginBottom: 4,
  },
  productLabel: {
    fontSize: 10,
    color: "inherit",
    opacity: 0.8,
  },
  callMessage: {
    flexDirection: "row",
    alignItems: "center",
  },
  callText: {
    marginLeft: 6,
  },
  replyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7F5",
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2F6F61",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  replyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  replyLabel: {
    fontSize: 12,
    color: "#2F6F61",
    marginLeft: 6,
    fontWeight: "600",
  },
  replyContent: {
    flex: 1,
    marginRight: 12,
  },
  replyText: {
    fontSize: 14,
    color: "#1A1A1C",
    fontStyle: 'italic',
  },
  replyClose: {
    padding: 4,
    borderRadius: 15,
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
  },
  replyPreview: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  myReplyPreview: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderLeftColor: "#FFFFFF",
  },
  otherReplyPreview: {
    backgroundColor: "rgba(47,111,97,0.1)",
    borderLeftColor: "#2F6F61",
  },
  replyPreviewBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 8,
  },
  myReplyBar: {
    backgroundColor: "#FFFFFF",
  },
  otherReplyBar: {
    backgroundColor: "#2F6F61",
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  myReplyName: {
    color: "rgba(255,255,255,0.9)",
  },
  otherReplyName: {
    color: "#2F6F61",
  },
  replyPreviewText: {
    fontSize: 11,
  },
  myReplyText: {
    color: "rgba(255,255,255,0.8)",
  },
  otherReplyText: {
    color: "#8E8E93",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#E8F0EC",
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
    marginBottom: 4,
    borderRadius: 20,
    backgroundColor: '#F0F7F5',
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F5F7F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: '#E8F0EC',
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: "#2F6F61",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: "#C8C8C8",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1C",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 25,
    padding: 15,
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#2F6F61',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  newMessagesBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  newMessagesText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "95%",
    height: "80%",
    resizeMode: "contain",
    borderRadius: 12,
  },
  modalClose: {
    position: "absolute",
    top: 60,
    right: 20,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
});