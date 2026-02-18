import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { chatService } from '../services';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { ChatSkeleton } from '../components/Skeleton';
import { FiArrowLeft, FiSend } from 'react-icons/fi';

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function resolveUrl(url) {
  if (!url) return `${API_BASE}/images/default-avatar.svg`;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function ChatPage() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const { socket, isOnline } = useSocket();
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  // Fetch other user info + messages
  useEffect(() => {
    chatService.getChat(userId)
      .then((res) => {
        setOtherUser(res.data.otherUser);
        setMessages(res.data.messages || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !userId) return;
    socket.emit('joinChat', { userId: me._id, otherUserId: userId });

    const handleMessage = (msg) => {
      if (msg.sender === userId || msg.sender === me._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    const handleTyping = (data) => {
      if (data.userId === userId) setTyping(true);
    };
    const handleStopTyping = (data) => {
      if (data.userId === userId) setTyping(false);
    };

    socket.on('chatMessage', handleMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('chatMessage', handleMessage);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [socket, userId, me._id]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const msg = text.trim();
    setText('');
    // Optimistic
    const tempMsg = { _id: Date.now(), sender: me._id, receiver: userId, text: msg, createdAt: new Date() };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      const res = await chatService.sendMessage(userId, msg);
      setMessages((prev) => prev.map((m) => (m._id === tempMsg._id ? res.data.message : m)));
      socket?.emit('chatMessage', { senderId: me._id, receiverId: userId, text: msg });
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
    }
  };

  const handleTypingInput = (e) => {
    setText(e.target.value);
    socket?.emit('typing', { userId: me._id, otherUserId: userId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit('stopTyping', { userId: me._id, otherUserId: userId });
    }, 1500);
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => <ChatSkeleton key={i} />)}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="card flex items-center gap-3 p-3 rounded-b-2xl sticky top-0 z-10">
        <Link to="/conversations" className="p-2 hover:bg-gray-100 rounded-full transition">
          <FiArrowLeft className="text-xl" />
        </Link>
        <div className="relative">
          <img src={resolveUrl(otherUser?.dp)}
            className="w-10 h-10 rounded-full object-cover" alt="" />
          {isOnline(userId) && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-primaryGreen border-2 border-white rounded-full" />
          )}
        </div>
        <div>
          <Link to={`/profile/${otherUser?._id}`} className="font-semibold text-sm hover:underline">
            {otherUser?.fullname || otherUser?.username}
          </Link>
          <p className="text-xs text-gray-400">
            {isOnline(userId) ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-10">
            No messages yet. Say hello! 👋
          </p>
        )}
        {messages.map((msg) => {
          const isMine = (msg.sender?._id || msg.sender) === me._id;
          return (
            <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  isMine
                    ? 'bg-[#FF76A4] text-white rounded-br-md'
                    : 'bg-[#9BD266]/25 text-gray-700 rounded-bl-md'
                }`}
              >
                <p>{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm px-4 py-2 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 flex gap-2 bg-white border-t">
        <input value={text} onChange={handleTypingInput}
          className="input-field flex-1" placeholder="Type a message..." autoFocus />
        <button type="submit" disabled={!text.trim()}
          className="btn-green px-4 rounded-full disabled:opacity-50">
          <FiSend />
        </button>
      </form>
    </div>
  );
}
