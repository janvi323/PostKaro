import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
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
