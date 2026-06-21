import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { chatService } from '../services';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { ChatSkeleton } from '../components/Skeleton';
import { FiArrowLeft, FiSend, FiTrash2 } from 'react-icons/fi';

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function resolveUrl(url) {
  if (!url) return `${API_BASE}/images/default-avatar.svg`;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function ChatPage() {
  const { userId } = useParams();          // peer user's _id from the URL
  const { user: me } = useAuth();
  const { socket, isOnline, deleteMessageForEveryone } = useSocket();

  const [otherUser, setOtherUser]   = useState(null);
  const [messages, setMessages]     = useState([]);
  const [text, setText]             = useState('');
  const [loading, setLoading]       = useState(true);
  const [typing, setTyping]         = useState(false);
  const [sending, setSending]       = useState(false);

  const bottomRef      = useRef(null);
  const typingTimeout  = useRef(null);

  // ── Effect 1: Load history from REST API ──────────────────────────────────
  useEffect(() => {
    setLoading(true);
    chatService
      .getChat(userId)
      .then((res) => {
        setOtherUser(res.data.otherUser);
        setMessages(res.data.messages || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Effect 2: Socket listeners ────────────────────────────────────────────
  //
  // BUG FIXED (root cause of "messages only appear after refresh"):
  //
  //   PROBLEM 1 — Wrong typing event key check:
  //     Backend emits: socket.to(room).emit('typing', { senderId })
  //     Old frontend:  if (data.userId === userId) ...   ← 'userId' does not exist
  //     Fixed:         if (data.senderId === userId) ...  ← matches what backend sends
  //
  //   PROBLEM 2 — Early return on null socket:
  //     When the component mounts, socket may still be null (async init).
  //     The effect re-runs when socket changes, so joinChat is called only
  //     once socket is ready. No change needed here, but the dependency array
  //     [socket, userId, me._id] guarantees this.
  //
  //   PROBLEM 3 — Duplicate message on sender's screen:
  //     Old handleSend called BOTH chatService.sendMessage() (REST → DB save)
  //     AND socket.emit('chatMessage') (socket → DB save again).
  //     The socket emit is the authoritative path: backend saves to DB and
  //     broadcasts to the room (including the sender). So the REST call is
  //     removed from handleSend. See handleSend below.
  //
  //   PROBLEM 4 — Sender's optimistic message was never replaced:
  //     Because the real message (from socket) arrived before the REST
  //     response, the replacement setMessages(prev.map(...)) found no match
  //     and the optimistic copy stayed permanently, causing a ghost duplicate.
  //     Fixed by removing the REST call entirely — the socket broadcast
  //     IS the confirmation for the sender too.
  //
  useEffect(() => {
    // Guard: socket not ready yet — effect will re-run when socket becomes non-null
    if (!socket || !userId || !me?._id) return;

    // Join the private room with the peer user
    // Backend builds room = [smallerId, largerId].sort().join('_')
    socket.emit('joinChat', { senderId: me._id, receiverId: userId });
    console.log('[ChatPage] 🚪 Emitted joinChat for peer:', userId);

    // ── chatMessage handler ──────────────────────────────────────────────
    //
    // Fires when EITHER user sends a message (backend broadcasts to the room).
    // This is the ONLY place new messages are added to state.
    //
    // BUG FIX: Check sender using both populated object (_id) and raw string
    // because the backend sometimes sends a populated sender object.
    const handleMessage = (msg) => {
      // BUG FIX — Debugging log so we can confirm receipt on frontend
      console.log('[ChatPage] 📨 chatMessage received:', msg);

      const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
      const receiverId = msg.receiver?._id?.toString() || msg.receiver?.toString();

      // Only append messages that belong to THIS conversation
      const isThisConversation =
        (senderId === me._id && receiverId === userId) ||
        (senderId === userId && receiverId === me._id);

      if (!isThisConversation) {
        console.log('[ChatPage] ℹ️  chatMessage not for this conversation — ignored');
        return;
      }

      setMessages((prev) => {
        // Deduplicate: if this message _id is already in state (e.g. from an
        // optimistic add), replace it rather than appending a duplicate.
        const exists = prev.some((m) => m._id?.toString() === msg._id?.toString());
        if (exists) {
          return prev.map((m) => (m._id?.toString() === msg._id?.toString() ? msg : m));
        }
        return [...prev, msg];
      });
    };

    // ── messageDeleted handler — "Unsend / Delete for Everyone" ──────────
    //
    // Backend emits: io.to(room).emit('messageDeleted', { messageId })
    // We replace the message content with a placeholder, like WhatsApp.
    //
    const handleMessageDeleted = ({ messageId }) => {
      console.log('[ChatPage] 🗑️  messageDeleted:', messageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id?.toString() === messageId?.toString()
            ? { ...msg, isDeleted: true, text: 'This message was deleted' }
            : msg
        )
      );
    };

    // ── typing handlers ───────────────────────────────────────────────────
    //
    // BUG FIX: Backend emits { senderId } but old code checked data.userId
    // which is always undefined → typing indicator never appeared.
    //
    const handleTyping = (data) => {
      if (data.senderId === userId) setTyping(true);
    };
    const handleStopTyping = (data) => {
      if (data.senderId === userId) setTyping(false);
    };

    // Register all listeners
    socket.on('chatMessage',     handleMessage);
    socket.on('messageDeleted',  handleMessageDeleted);
    socket.on('typing',          handleTyping);
    socket.on('stopTyping',      handleStopTyping);

    console.log('[ChatPage] ✅ Socket listeners registered');

    // ── Cleanup: remove listeners when component unmounts or deps change ──
    //
    // BUG FIX: Not removing listeners causes DUPLICATE listeners to stack up
    // every time the effect re-runs (e.g. socket reconnects). Each listener
    // would fire N times, causing duplicate appends.
    //
    return () => {
      socket.off('chatMessage',    handleMessage);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('typing',         handleTyping);
      socket.off('stopTyping',     handleStopTyping);
      console.log('[ChatPage] 🧹 Socket listeners removed');
    };
  }, [socket, userId, me?._id]);

  // ── Effect 3: Auto-scroll to bottom when messages change ─────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // ── handleSend — send via socket ONLY ────────────────────────────────────
  //
  // BUG FIXED: Old code called BOTH chatService.sendMessage() (REST → saves to DB)
  // AND socket.emit('chatMessage') (socket → backend saves to DB again).
  // This caused:
  //   1. Two DB rows per message (duplicate content)
  //   2. Sender saw the message twice (optimistic + socket broadcast)
  //   3. REST response arrived and tried to replace the temp ID, but the
  //      socket message already arrived first with a different _id → ghost copy
  //
  // FIX: Use socket as the ONLY send path. The backend's chatMessage handler
  // saves to DB AND broadcasts back to the room (including sender). So the
  // sender's UI also updates via the socket event — no optimistic add needed.
  //
  const handleSend = useCallback(
    async (e) => {
      e.preventDefault();
      const msg = text.trim();
      if (!msg || sending) return;

      setText('');
      setSending(true);

      try {
        if (socket?.connected) {
          // PRIMARY PATH: socket send — backend saves & broadcasts to room
          socket.emit('chatMessage', { senderId: me._id, receiverId: userId, text: msg });
          console.log('[ChatPage] 📤 chatMessage emitted via socket');
        } else {
          // FALLBACK PATH: REST send when socket is not connected.
          // This saves to DB but does NOT update the other user in real-time.
          // The message will appear for them on next page load / refresh.
          console.warn('[ChatPage] ⚠️  Socket disconnected — falling back to REST');
          const res = await chatService.sendMessage(userId, msg);
          // Manually append since no socket broadcast will arrive
          setMessages((prev) => [...prev, res.data.message]);
        }
      } catch (err) {
        console.error('[ChatPage] ❌ Send failed:', err);
        // Re-populate the input so the user can retry
        setText(msg);
      } finally {
        setSending(false);
      }
    },
    [socket, text, sending, me._id, userId]
  );

  // ── handleTypingInput ─────────────────────────────────────────────────────
  const handleTypingInput = (e) => {
    setText(e.target.value);
    // Emit with receiverId key — matches backend's resolvePeerId logic
    socket?.emit('typing', { senderId: me._id, receiverId: userId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit('stopTyping', { senderId: me._id, receiverId: userId });
    }, 1500);
  };

  // ── handleDeleteForMe ─────────────────────────────────────────────────────
  // Soft-deletes the message for the current user only (REST).
  const handleDeleteForMe = async (messageId) => {
    try {
      await chatService.deleteMessageForMe(messageId);
      // Remove from local state immediately
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) {
      console.error('[ChatPage] ❌ Delete for me failed:', err);
    }
  };

  // ── handleUnsend ──────────────────────────────────────────────────────────
  // Deletes for EVERYONE via socket (real-time) + REST (persistence).
  const handleUnsend = async (messageId) => {
    try {
      // Real-time: broadcast messageDeleted to the room
      deleteMessageForEveryone(messageId);
      // Persistence: mark isDeleted=true in DB
      await chatService.unsendMessage(messageId);
    } catch (err) {
      console.error('[ChatPage] ❌ Unsend failed:', err);
    }
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => <ChatSkeleton key={i} />)}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-80px)]">

      {/* ── Header ── */}
      <div className="card flex items-center gap-3 p-3 rounded-b-2xl sticky top-0 z-10">
        <Link to="/conversations" className="p-2 hover:bg-gray-100 rounded-full transition">
          <FiArrowLeft className="text-xl" />
        </Link>
        <div className="relative">
          <img
            src={resolveUrl(otherUser?.dp)}
            className="w-10 h-10 rounded-full object-cover"
            alt=""
          />
          {isOnline(userId) && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-brandGreen border-2 border-white rounded-full" />
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

      {/* ── Message List ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-10">
            No messages yet. Say hello! 👋
          </p>
        )}

        {messages.map((msg) => {
          // BUG FIX: Normalise sender ID — backend sends populated object OR raw string
          const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
          const isMine = senderId === me._id;

          return (
            <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
              <div
                className={`relative max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  isMine
                    ? 'bg-[#FF76A4] text-white rounded-br-md'
                    : 'bg-[#9BD266]/25 text-gray-700 rounded-bl-md'
                }`}
              >
                {/* Message text — show placeholder if deleted for everyone */}
                {msg.isDeleted ? (
                  <p className="italic text-sm opacity-60">This message was deleted</p>
                ) : (
                  <p>{msg.text}</p>
                )}

                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                  {formatTime(msg.createdAt)}
                </p>

                {/* Delete options — shown on hover, only for own non-deleted messages */}
                {isMine && !msg.isDeleted && (
                  <div className="absolute -top-7 right-0 hidden group-hover:flex gap-1 bg-white shadow-md rounded-lg px-2 py-1 z-10">
                    <button
                      onClick={() => handleDeleteForMe(msg._id)}
                      title="Delete for me"
                      className="text-xs text-gray-500 hover:text-red-500 whitespace-nowrap"
                    >
                      Delete for me
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => handleUnsend(msg._id)}
                      title="Unsend"
                      className="text-xs text-gray-500 hover:text-red-500 whitespace-nowrap"
                    >
                      Unsend
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
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

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <form onSubmit={handleSend} className="p-3 flex gap-2 bg-white border-t">
        <input
          value={text}
          onChange={handleTypingInput}
          className="input-field flex-1"
          placeholder="Type a message..."
          autoFocus
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="btn-green px-4 rounded-full disabled:opacity-50"
        >
          <FiSend />
        </button>
      </form>
    </div>
  );
}
