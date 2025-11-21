// frontend/src/hooks/useSocket.js - NEW FILE
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import io from 'socket.io-client';
import { API_URL } from '../constants/config';
import { useAuth } from '../context/AuthContext';

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const [isConnected, setIsConnected] = useState(false);

  // ✅ Get fresh token function
  const getFreshToken = async () => {
    try {
      if (!user) return null;
      const token = await user.getIdToken(true); // Force refresh
      return token;
    } catch (error) {
      console.error('Error getting fresh token:', error);
      return null;
    }
  };

  // ✅ Initialize socket connection
  const initializeSocket = async () => {
    try {
      console.log('🔌 Initializing socket connection...');
      
      // Disconnect existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      const token = await getFreshToken();
      if (!token) {
        console.error('❌ No token available');
        return;
      }

      socketRef.current = io(API_URL, {
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
      });

      // ✅ Connection events
      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected:', socketRef.current.id);
        setIsConnected(true);
        
        // Clear any pending reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);

        // Auto-reconnect if disconnected unexpectedly
        if (reason === 'io server disconnect') {
          // Server disconnected, reconnect with fresh token
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Reconnecting with fresh token...');
            initializeSocket();
          }, 2000);
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        setIsConnected(false);

        // Try to reconnect with fresh token
        if (error.message.includes('Authentication')) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Reconnecting due to auth error...');
            initializeSocket();
          }, 3000);
        }
      });

      socketRef.current.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
      });

      socketRef.current.on('reconnect', (attemptNumber) => {
        console.log(`✅ Reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
      });

      socketRef.current.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

    } catch (error) {
      console.error('❌ Socket initialization error:', error);
    }
  };

  // ✅ Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      console.log('📱 App state changed:', appState.current, '->', nextAppState);

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - reconnect socket with fresh token
        console.log('🔄 App came to foreground, reconnecting socket...');
        
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
        
        await initializeSocket();
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        console.log('📱 App went to background');
        // Keep connection alive but don't disconnect
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [user]);

  // ✅ Initialize socket when user is available
  useEffect(() => {
    if (user) {
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user]);

  // ✅ Force reconnect function
  const forceReconnect = async () => {
    console.log('🔄 Force reconnecting...');
    await initializeSocket();
  };

  return {
    socket: socketRef.current,
    isConnected,
    forceReconnect,
  };
};