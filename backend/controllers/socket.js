const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/users');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * getToken — reads the JWT from socket handshake.
 * Supports both socket.handshake.auth.token (preferred) and
 * the Authorization header (fallback for older clients).
 */
const getToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const header = socket.handshake.headers?.authorization;
  if (authToken) return authToken;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
};

/**
 * canMessageUser — checks whether senderId is allowed to message receiverId.
 * Rule: sender must follow receiver OR receiver's account must be public.
 */
const canMessageUser = async (senderId, receiverId) => {
  const [sender, receiver] = await Promise.all([
    User.findById(senderId).select('following').lean(),
    User.findById(receiverId).select('isPrivate').lean(),
  ]);
  if (!sender || !receiver) return false;
  return sender.following.some((id) => id.toString() === receiverId.toString()) || !receiver.isPrivate;
};

/**
 * buildRoom — deterministic room name shared by both participants.
 * Sorting IDs ensures A<->B and B<->A produce the same room string.
 */
const buildRoom = (a, b) => [a.toString(), b.toString()].sort().join('_');

// ---------------------------------------------------------------------------
// Socket Controller
// ---------------------------------------------------------------------------

function socketController(io) {
  // In-memory map: userId → socket.id (tracks who is currently online)
  const onlineUsers = new Map();

  // ── Middleware: Authenticate every socket connection ─────────────────────
  io.use(async (socket, next) => {
    try {
      const token = getToken(socket);
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: process.env.JWT_ISSUER || 'postkaro-api',
        audience: process.env.JWT_AUDIENCE || 'postkaro-web',
      });

      const user = await User.findById(decoded.id).select('_id username role').lean();
      if (!user) return next(new Error('Invalid socket user'));

      // Attach user to socket so all event handlers can access it
      socket.user = user;
      return next();
    } catch (err) {
      console.error('[Socket] Auth middleware error:', err.message);
      return next(new Error('Invalid socket token'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Register this socket as the user's active connection
    onlineUsers.set(userId, socket.id);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));

    // BUG FIX — Debugging log so we can confirm connection in server console
    console.log(`[Socket] ✅ Connected  socket=${socket.id}  user=${userId} (${socket.user.username})`);

    // ── Error handler ──────────────────────────────────────────────────────
    socket.on('error', (err) => {
      console.error(`[Socket] ⚠️  Error on socket ${socket.id}:`, err.message);
    });

    // ── register — re-maps userId after reconnect ──────────────────────────
    // Called by the frontend after every connect/reconnect event.
    socket.on('register', () => {
      onlineUsers.set(userId, socket.id);
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
      console.log(`[Socket] 🔄 Re-registered user=${userId}`);
    });

    // ── joinChat — put this socket into a deterministic private room ────────
    //
    // IMPORTANT: The room name is [smallerId]_[largerId] (sorted). Both
    // participants call joinChat independently and end up in the same room.
    // The frontend sends { senderId, receiverId } OR { userId, otherUserId }.
    //
    socket.on('joinChat', (payload = {}) => {
      const { senderId, receiverId, userId: legacyUserId, otherUserId } = payload;

      // Resolve the peer's ID (the one that is NOT the connected user)
      const peerId =
        receiverId && receiverId.toString() !== userId ? receiverId :
        senderId   && senderId.toString()   !== userId ? senderId   :
        otherUserId && otherUserId.toString() !== userId ? otherUserId :
        legacyUserId && legacyUserId.toString() !== userId ? legacyUserId :
        null;

      if (!peerId) {
        console.warn(`[Socket] joinChat — could not resolve peerId for user=${userId}`, payload);
        return;
      }

      const room = buildRoom(userId, peerId);
      socket.join(room);

      // BUG FIX — Debugging log for room join
      console.log(`[Socket] 🚪 Joined room="${room}"  user=${userId}`);
    });

    // ── chatMessage — save to DB then broadcast to room ────────────────────
    //
    // FLOW:
    //   Frontend (User A) → socket.emit('chatMessage', { receiverId, text })
    //   Backend            → saves to MongoDB
    //   Backend            → io.to(room).emit('chatMessage', populatedMsg)
    //   Frontend (User A & B) → socket.on('chatMessage', handler) fires
    //
    // IMPORTANT: The frontend must NOT also call chatService.sendMessage()
    // (the REST POST) when sending via socket. Doing both causes a duplicate
    // save. Choose ONE path: socket OR REST.  This backend handler IS the
    // authoritative save — REST /chat/:userId/send is only used if socket is
    // unavailable.
    //
    socket.on('chatMessage', async (payload = {}) => {
      try {
        const { senderId, receiverId, text } = payload;

        // BUG FIX — Debugging log so we can confirm receipt on backend
        console.log(`[Socket] 📨 chatMessage received from user=${userId}`, { receiverId, text: text?.slice(0, 50) });

        // Resolve receiver — accept both { receiverId } and legacy { senderId }
        const resolvedReceiverId =
          receiverId && receiverId.toString() !== userId ? receiverId :
          senderId   && senderId.toString()   !== userId ? senderId   :
          null;

        const messageText = typeof text === 'string' ? text.trim().slice(0, 2000) : '';

        if (!resolvedReceiverId || resolvedReceiverId.toString() === userId || !messageText) {
          console.warn(`[Socket] chatMessage — invalid payload`, { resolvedReceiverId, messageText });
          return;
        }

        // Permission check
        const allowed = await canMessageUser(userId, resolvedReceiverId);
        if (!allowed) {
          socket.emit('chatError', { message: 'Cannot send message to this user' });
          return;
        }

        const room = buildRoom(userId, resolvedReceiverId);

        // Save to MongoDB
        const newMsg = new Message({ sender: userId, receiver: resolvedReceiverId, text: messageText });
        await newMsg.save();

        // Populate sender/receiver for the frontend
        const populated = await Message.findById(newMsg._id)
          .populate('sender', 'username fullname dp')
          .populate('receiver', 'username fullname dp');

        // BUG FIX — Emit to the room (both sockets are in this room)
        // This is the ONLY emit that makes real-time work for BOTH users.
        io.to(room).emit('chatMessage', populated);
        console.log(`[Socket] 📤 chatMessage emitted to room="${room}"`);

        // Optional: push a notification bubble to the receiver's socket
        // even if they are not currently on the ChatPage
        const receiverSocketId = onlineUsers.get(resolvedReceiverId.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('newMessageNotification', {
            senderId: userId,
            text: messageText.substring(0, 50),
          });
        }
      } catch (err) {
        console.error('[Socket] ❌ chatMessage error:', err.message);
        socket.emit('chatError', { message: 'Unable to send message' });
      }
    });

    // ── typing / stopTyping — relay to peer in the same room ───────────────
    socket.on('typing', (payload = {}) => {
      const { receiverId, otherUserId } = payload;
      const peerId = receiverId || otherUserId;
      if (!peerId || peerId.toString() === userId) return;
      const room = buildRoom(userId, peerId);
      // Emit { senderId } so the frontend knows WHO is typing
      socket.to(room).emit('typing', { senderId: userId });
    });

    socket.on('stopTyping', (payload = {}) => {
      const { receiverId, otherUserId } = payload;
      const peerId = receiverId || otherUserId;
      if (!peerId || peerId.toString() === userId) return;
      const room = buildRoom(userId, peerId);
      socket.to(room).emit('stopTyping', { senderId: userId });
    });

    // ── messageDeleted — "Unsend / Delete for Everyone" ────────────────────
    //
    // Frontend emits: socket.emit('deleteMessage', { messageId, chatId })
    // Backend:
    //   1. Verifies ownership (only sender can unsend)
    //   2. Sets isDeleted = true in DB
    //   3. Emits 'messageDeleted' to the chat room
    // Frontend receives: socket.on('messageDeleted', ({ messageId }) => ...)
    //   → replaces message content with "This message was deleted"
    //
    socket.on('deleteMessage', async (payload = {}) => {
      try {
        const { messageId } = payload;
        if (!messageId) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        // Only the original sender can unsend
        if (message.sender.toString() !== userId) {
          socket.emit('chatError', { message: 'You can only unsend your own messages' });
          return;
        }

        message.isDeleted = true;
        await message.save();

        const room = buildRoom(userId, message.receiver.toString());
        io.to(room).emit('messageDeleted', { messageId });
        console.log(`[Socket] 🗑️  messageDeleted  id=${messageId}  room="${room}"`);
      } catch (err) {
        console.error('[Socket] ❌ deleteMessage error:', err.message);
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      // Only remove from onlineUsers if THIS socket is still the registered one
      // (prevents removing a newer reconnected socket for the same user)
      if (onlineUsers.get(userId) === socket.id) {
        onlineUsers.delete(userId);
      }
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));

      // BUG FIX — Debugging log with disconnect reason
      console.log(`[Socket] ❌ Disconnected  socket=${socket.id}  user=${userId}  reason=${reason}`);
    });
  });
}

module.exports = socketController;
