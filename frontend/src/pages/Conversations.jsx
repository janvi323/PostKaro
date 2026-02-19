import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { conversationService } from '../services';
import { useSocket } from '../context/SocketContext';
import { ChatSkeleton } from '../components/Skeleton';
import { FiSearch, FiMessageSquare } from 'react-icons/fi';

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOnline } = useSocket();

  useEffect(() => {
    conversationService
      .getAll()
      .then((res) => setConversations(res.data.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      conversationService.searchUsers(searchQuery)
        .then((res) => setSearchResults(res.data))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const markAllRead = async () => {
    await conversationService.markAllRead();
    setConversations((prev) => prev.map((c) => ({ ...c, unreadCount: 0 })));
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
        <button onClick={markAllRead}
          className="text-sm text-brandGreen hover:underline">Mark all read</button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-10" placeholder="Search users to chat..." />
        {searchResults.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full card max-h-60 overflow-y-auto">
            {searchResults.map((u) => (
              <Link key={u._id} to={`/chat/${u._id}`}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 transition">
                <img src={u.dp || '/images/dp/default-avatar.svg'}
                  className="w-10 h-10 rounded-full object-cover" alt="" />
                <div>
                  <p className="font-medium text-sm">{u.fullname || u.username}</p>
                  <p className="text-xs text-gray-400">@{u.username}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Conversation List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <ChatSkeleton key={i} />)}</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FiMessageSquare className="mx-auto text-5xl mb-4" />
          <p>No conversations yet</p>
          <p className="text-sm mt-1">Search for someone to start chatting!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link key={conv.otherUser._id} to={`/chat/${conv.otherUser._id}`}
              className={`card flex items-center gap-3 p-4 hover:shadow-card-hover transition ${
                conv.unreadCount > 0 ? 'border-l-4 border-primaryPink' : ''
              }`}>
              <div className="relative flex-shrink-0">
                <img src={conv.otherUser.dp || '/images/dp/default-avatar.svg'}
                  className="w-12 h-12 rounded-full object-cover" alt="" />
                {isOnline(conv.otherUser._id) && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-brandGreen border-2 border-white rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="font-semibold text-sm truncate">
                    {conv.otherUser.fullname || conv.otherUser.username}
                  </p>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {timeAgo(conv.lastMessage?.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{conv.lastMessage?.text || 'Start a conversation'}</p>
              </div>
              {conv.unreadCount > 0 && (
                <span className="flex-shrink-0 bg-primaryPink text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {conv.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
