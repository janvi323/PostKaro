import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

/**
 * In development Vite proxies /socket.io → http://localhost:5000, so we
 * pass an empty string (= same origin) and avoid a direct cross-port
 * connection that triggers the "WebSocket closed before established" error.
 * In production we use the explicit backend URL from the env variable.
 */
const SOCKET_URL = import.meta.env.DEV
  ? ''                                                   // let Vite proxy handle it
  : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      const newSocket = io(SOCKET_URL, {
        /**
         * Start with WebSocket directly — Vite proxy has ws:true so the
         * upgrade is proxied correctly in dev, and in production WebSocket
         * is supported natively.
         *
         * Using polling-first caused a connect→upgrade→drop→500 cycle:
         *   1. Polling handshake succeeds → "connect" fires
         *   2. Socket.IO upgrades that session to WebSocket
         *   3. Proxy closes the WS → "transport close"
         *   4. Client retries polling with the now-invalid (upgraded) sid → 500
         *
         * Trying WebSocket first avoids the upgrade cycle entirely.
         * Polling is listed as a fallback for environments that block WS.
         */
        transports: ['websocket', 'polling'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      newSocket.on('connect', () => {
        console.log('[Socket] Connected:', newSocket.id);
        newSocket.emit('register', user._id);
      });

      newSocket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
      });

      newSocket.on('disconnect', (reason) => {
        console.warn('[Socket] Disconnected:', reason);
      });

      newSocket.on('reconnect', (attempt) => {
        console.log('[Socket] Reconnected after', attempt, 'attempt(s)');
        newSocket.emit('register', user._id);
      });

      newSocket.on('onlineUsers', (users) => {
        setOnlineUsers(users);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    }
  }, [user]);

  const joinChat = (senderId, receiverId) => {
    socket?.emit('joinChat', { senderId, receiverId });
  };

  const sendMessage = (senderId, receiverId, text) => {
    socket?.emit('chatMessage', { senderId, receiverId, text });
  };

  const emitTyping = (senderId, receiverId) => {
    socket?.emit('typing', { senderId, receiverId });
  };

  const emitStopTyping = (senderId, receiverId) => {
    socket?.emit('stopTyping', { senderId, receiverId });
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  return (
    <SocketContext.Provider
      value={{ socket, onlineUsers, joinChat, sendMessage, emitTyping, emitStopTyping, isOnline }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
}
