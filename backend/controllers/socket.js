const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/users');

const getToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const header = socket.handshake.headers?.authorization;
  if (authToken) return authToken;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
};

const canMessageUser = async (senderId, receiverId) => {
  const [sender, receiver] = await Promise.all([
    User.findById(senderId).select('following').lean(),
    User.findById(receiverId).select('isPrivate').lean(),
  ]);
  if (!sender || !receiver) return false;
  return sender.following.some((id) => id.toString() === receiverId.toString()) || !receiver.isPrivate;
};

function socketController(io) {
  const onlineUsers = new Map();

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

      socket.user = user;
      return next();
    } catch (err) {
      return next(new Error('Invalid socket token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    console.log(`Socket connected: ${socket.id} user=${userId}`);

    socket.on('error', (err) => {
      console.error(`[Socket] Error on socket ${socket.id}:`, err.message);
    });

    socket.on('register', () => {
      onlineUsers.set(userId, socket.id);
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });

    const resolvePeerId = ({ senderId, receiverId, userId: legacyUserId, otherUserId } = {}) => {
      if (receiverId && receiverId.toString() !== userId) return receiverId;
      if (senderId && senderId.toString() !== userId) return senderId;
      if (otherUserId && otherUserId.toString() !== userId) return otherUserId;
      if (legacyUserId && legacyUserId.toString() !== userId) return legacyUserId;
      return receiverId || senderId;
    };

    socket.on('joinChat', (payload) => {
      const peerId = resolvePeerId(payload);
      if (!peerId || peerId.toString() === userId) return;
      const room = [userId, peerId].sort().join('_');
      socket.join(room);
    });

    socket.on('chatMessage', async (payload = {}) => {
      try {
        const receiverId = resolvePeerId(payload);
        const { text } = payload;
        const messageText = typeof text === 'string' ? text.trim().slice(0, 2000) : '';
        if (!receiverId || receiverId.toString() === userId || !messageText) return;

        const allowed = await canMessageUser(userId, receiverId);
        if (!allowed) {
          socket.emit('chatError', { message: 'Cannot send message to this user' });
          return;
        }

        const room = [userId, receiverId].sort().join('_');
        const newMsg = new Message({ sender: userId, receiver: receiverId, text: messageText });
        await newMsg.save();

        const populated = await Message.findById(newMsg._id)
          .populate('sender', 'username fullname dp')
          .populate('receiver', 'username fullname dp');

        io.to(room).emit('chatMessage', populated);

        const receiverSocketId = onlineUsers.get(receiverId.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('newMessageNotification', {
            senderId: userId,
            text: messageText.substring(0, 50),
          });
        }
      } catch (err) {
        console.error('Socket chat error:', err.message);
        socket.emit('chatError', { message: 'Unable to send message' });
      }
    });

    socket.on('typing', (payload) => {
      const receiverId = resolvePeerId(payload);
      if (!receiverId || receiverId.toString() === userId) return;
      const room = [userId, receiverId].sort().join('_');
      socket.to(room).emit('typing', { senderId: userId });
    });

    socket.on('stopTyping', (payload) => {
      const receiverId = resolvePeerId(payload);
      if (!receiverId || receiverId.toString() === userId) return;
      const room = [userId, receiverId].sort().join('_');
      socket.to(room).emit('stopTyping', { senderId: userId });
    });

    socket.on('disconnect', () => {
      if (onlineUsers.get(userId) === socket.id) {
        onlineUsers.delete(userId);
      }
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
      console.log(`Socket disconnected: ${socket.id} user=${userId}`);
    });
  });
}

module.exports = socketController;
