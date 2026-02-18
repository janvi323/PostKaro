import { useState, useEffect, useRef, useCallback } from 'react';
import { HiChat, HiX, HiPaperAirplane, HiSearch } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { conversationService, chatService } from '../services';
import { ChatSkeleton } from './Skeleton';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function ChatWidget() {
  const { user } = useAuth();
  const { socket, joinChat, isOnline } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEnd = useRef(null);

  // Fetch conversations
  useEffect(() => {
    if (isOpen && !activeChat) {
      conversationService.getAll().then((r) => {
        setConversations(r.data.conversations || []);
        const total = (r.data.conversations || []).reduce((a, c) => a + (c.unreadCount || 0), 0);
        setUnread(total);
      }).catch(() => {});
    }
  }, [isOpen, activeChat]);

  // Socket message handler
  useEffect(() => {
    if (!socket) return;
    const handleNewMsg = (msg) => {
      if (activeChat && (msg.sender?._id === activeChat._id || msg.sender === activeChat._id)) {
        setMessages((prev) => [...prev, msg]);
      } else {
        setUnread((p) => p + 1);
        toast(`New message from ${msg.sender?.fullname || 'someone'}`, { icon: '💬' });
      }
    };
    socket.on('chatMessage', handleNewMsg);
    socket.on('typing', () => setTyping(true));
    socket.on('stopTyping', () => setTyping(false));
    return () => {
      socket.off('chatMessage', handleNewMsg);
      socket.off('typing');
      socket.off('stopTyping');
    };
  }, [socket, activeChat]);

  // Scroll on new message
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openChat = async (otherUser) => {
    try {
      setLoading(true);
      setActiveChat(otherUser);
      joinChat(user._id, otherUser._id);
      const res = await chatService.getChat(otherUser._id);
      setMessages(res.data.messages || []);
    } catch {
      toast.error('Cannot open chat');
      setActiveChat(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    const msgText = text.trim();
    setText('');

    // Optimistic update
    const optimistic = {
      _id: Date.now(),
      sender: { _id: user._id, username: user.username, dp: user.dp },
      receiver: { _id: activeChat._id },
      text: msgText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      socket?.emit('chatMessage', { senderId: user._id, receiverId: activeChat._id, text: msgText });
    } catch {
      toast.error('Failed to send');
    }
  };

  const dpUrl = (dp) => dp?.startsWith('http') ? dp : `${API_BASE}${dp || '/images/default-avatar.svg'}`;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-strongPink text-white rounded-full shadow-xl
                   hover:scale-110 transition-all duration-300 flex items-center justify-center z-40
                   hover:shadow-2xl active:scale-95"
      >
        {isOpen ? <HiX className="w-6 h-6" /> : <HiChat className="w-6 h-6" />}
        {!isOpen && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primaryGreen text-white text-xs
                           rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] bg-white rounded-3xl shadow-2xl z-40
                        border border-pink-100 flex flex-col overflow-hidden
                        animate-[slideUp_0.3s_ease-out]">
          {!activeChat ? (
            // Conversation list
            <>
              <div className="px-4 py-3 border-b border-pink-100 bg-gradient-to-r from-strongPink to-softPink">
                <h3 className="text-white font-bold">Messages</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No conversations yet
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.otherUser._id}
                      onClick={() => openChat(conv.otherUser)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pink-50 transition-colors text-left"
                    >
                      <div className="relative">
                        <img src={dpUrl(conv.otherUser.dp)} alt=""
                          className="w-10 h-10 rounded-full object-cover border-2 border-pink-100" />
                        {isOnline(conv.otherUser._id) && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-primaryGreen rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{conv.otherUser.fullname}</p>
                        <p className="text-xs text-gray-400 truncate">{conv.lastMessage?.text}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-strongPink text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            // Active chat
            <>
              <div className="px-4 py-3 border-b border-pink-100 flex items-center gap-3 bg-gradient-to-r from-strongPink to-softPink">
                <button onClick={() => setActiveChat(null)}
                  className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors text-sm">
                  ←
                </button>
                <div className="relative">
                  <img src={dpUrl(activeChat.dp)} alt=""
                    className="w-8 h-8 rounded-full object-cover border-2 border-white/50" />
                  {isOnline(activeChat._id) && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primaryGreen rounded-full border-2 border-white" />
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{activeChat.fullname}</p>
                  {typing ? (
                    <p className="text-white/70 text-xs">typing...</p>
                  ) : isOnline(activeChat._id) ? (
                    <p className="text-white/70 text-xs">online</p>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-pink-50/30">
                {loading ? (
                  <ChatSkeleton />
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Start a conversation
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMine = (msg.sender?._id || msg.sender) === user._id;
                    return (
                      <div key={msg._id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                            isMine
                              ? 'bg-strongPink text-white rounded-br-md'
                              : 'bg-white text-gray-700 rounded-bl-md shadow-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEnd} />
              </div>

              <form onSubmit={handleSend} className="p-3 border-t border-pink-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-pink-50 border border-pink-100 text-sm
                             focus:outline-none focus:border-strongPink transition-colors"
                />
                <button type="submit"
                  className="p-2.5 bg-strongPink text-white rounded-2xl hover:bg-pink-500 transition-colors
                             active:scale-95">
                  <HiPaperAirplane className="w-4 h-4 rotate-90" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
