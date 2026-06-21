import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

/**
 * SOCKET_URL resolution:
 *  - In development: empty string → Vite proxy forwards /socket.io → localhost:5000.
 *    This avoids a cross-port WebSocket that triggers "WebSocket closed before established".
 *  - In production: use VITE_SOCKET_URL env var (set to your backend URL).
 */
const SOCKET_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

export function SocketProvider({ children }) {
  const { user } = useAuth();

  // socket — the live socket.io instance (null when logged out)
  const [socket, setSocket] = useState(null);

  // onlineUsers — array of userId strings currently connected
  const [onlineUsers, setOnlineUsers] = useState([]);

  // socketRef mirrors state so callbacks always read the current socket
  // without needing it as a useEffect dependency (avoids re-subscription loops)
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!user || !token) {
      // User logged out — cleanly disconnect any existing socket
      if (socketRef.current) {
        console.log('[Socket] 🔌 User logged out — disconnecting socket');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setOnlineUsers([]);
      }
      return;
    }

    // BUG FIX: Prevent creating a second socket if one already exists for
    // the same user (e.g. StrictMode double-mount or hot reload).
    if (socketRef.current?.connected) {
      console.log('[Socket] ℹ️  Socket already connected, skipping re-init');
      return;
    }

    console.log('[Socket] 🔄 Initialising socket for user:', user._id);

    const newSocket = io(SOCKET_URL, {
      /**
       * Start with WebSocket directly.
       * Polling-first causes connect→upgrade→drop→500 cycle in some proxy setups:
       *   1. Polling handshake succeeds → "connect" fires
       *   2. Socket.IO upgrades to WebSocket
       *   3. Proxy closes WS → "transport close"
       *   4. Client retries polling with now-invalid session id → 500
       * Using WebSocket first avoids the upgrade cycle entirely.
       * Polling is kept as a fallback for environments that block WS.
       */
      transports: ['websocket', 'polling'],
      auth: { token },
      extraHeaders: { Authorization: `Bearer ${token}` },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // ── connect ────────────────────────────────────────────────────────────
    newSocket.on('connect', () => {
      // BUG FIX — Debugging log: confirm frontend socket is connected
      console.log('[Socket] ✅ Connected:', newSocket.id);

      // Re-register with the backend so onlineUsers map stays accurate
      // (also runs after every reconnect via the 'reconnect' event below)
      newSocket.emit('register');
    });

    // ── connect_error ──────────────────────────────────────────────────────
    newSocket.on('connect_error', (err) => {
      // BUG FIX — Debugging log
      console.error('[Socket] ❌ Connection error:', err.message);
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    newSocket.on('disconnect', (reason) => {
      // BUG FIX — Debugging log with reason
      console.warn('[Socket] 🔌 Disconnected:', reason);
    });

    // ── reconnect ──────────────────────────────────────────────────────────
    newSocket.on('reconnect', (attempt) => {
      console.log('[Socket] 🔄 Reconnected after', attempt, 'attempt(s)');
      // Re-register on the backend after reconnection
      newSocket.emit('register');
    });

    // ── onlineUsers — broadcast from backend whenever someone connects/disconnects
    newSocket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup: disconnect socket when user logs out or component unmounts
    return () => {
      console.log('[Socket] 🧹 Cleanup — disconnecting socket');
      newSocket.disconnect();
      socketRef.current = null;
      // Do NOT call setSocket(null) here — React will call the next run of
      // this effect which handles the null case correctly.
    };
  }, [user]); // Re-run only when user changes (login / logout)

  // ---------------------------------------------------------------------------
  // Stable helper functions exposed to consumers
  // ---------------------------------------------------------------------------

  /**
   * joinChat — emits joinChat event so the backend adds this socket to the
   * private room shared with the peer user.
   *
   * @param {string} senderId   — current user's _id
   * @param {string} receiverId — chat partner's _id
   */
  const joinChat = useCallback((senderId, receiverId) => {
    socketRef.current?.emit('joinChat', { senderId, receiverId });
  }, []);

  /**
   * sendMessage — emit chatMessage via socket (the AUTHORITATIVE send path).
   * Do NOT call chatService.sendMessage() at the same time — that saves to DB
   * again and creates duplicate messages.
   *
   * @param {string} senderId   — current user's _id
   * @param {string} receiverId — chat partner's _id
   * @param {string} text       — message text
   */
  const sendMessage = useCallback((senderId, receiverId, text) => {
    socketRef.current?.emit('chatMessage', { senderId, receiverId, text });
  }, []);

  /**
   * emitTyping / emitStopTyping — relay typing indicator to the peer.
   */
  const emitTyping = useCallback((senderId, receiverId) => {
    socketRef.current?.emit('typing', { senderId, receiverId });
  }, []);

  const emitStopTyping = useCallback((senderId, receiverId) => {
    socketRef.current?.emit('stopTyping', { senderId, receiverId });
  }, []);

  /**
   * deleteMessageForEveryone — emit deleteMessage to the backend.
   * Backend sets isDeleted=true and emits 'messageDeleted' to the room.
   */
  const deleteMessageForEveryone = useCallback((messageId) => {
    socketRef.current?.emit('deleteMessage', { messageId });
  }, []);

  /**
   * isOnline — returns true if the given userId is in the onlineUsers list.
   */
  const isOnline = useCallback((userId) => onlineUsers.includes(userId), [onlineUsers]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        joinChat,
        sendMessage,
        emitTyping,
        emitStopTyping,
        deleteMessageForEveryone,
        isOnline,
      }}
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
