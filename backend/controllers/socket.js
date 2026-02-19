const Message = require('../models/Message');

function socketController(io) {
  // Track online users
  const onlineUsers = new Map(); // userId -> socketId

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Per-socket error handler (e.g. malformed packets)
    socket.on('error', (err) => {
      console.error(`[Socket] Error on socket ${socket.id}:`, err.message);
    });

    // Register user as online
    socket.on('register', (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });

    // Join chat room
    socket.on('joinChat', ({ senderId, receiverId }) => {
      const room = [senderId, receiverId].sort().join('_');
      socket.join(room);
    });

    // Chat message
    socket.on('chatMessage', async ({ senderId, receiverId, text }) => {
      try {
        const room = [senderId, receiverId].sort().join('_');
        const newMsg = new Message({ sender: senderId, receiver: receiverId, text });
        await newMsg.save();

        const populated = await Message.findById(newMsg._id)
          .populate('sender', 'username fullname dp')
          .populate('receiver', 'username fullname dp');

        io.to(room).emit('chatMessage', populated);

        // Notify receiver if not in room
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('newMessageNotification', {
            senderId,
            text: text.substring(0, 50),
          });
        }
      } catch (err) {
        console.error('Socket chat error:', err);
      }
    });

    // Typing indicator
    socket.on('typing', ({ senderId, receiverId }) => {
      const room = [senderId, receiverId].sort().join('_');
      socket.to(room).emit('typing', { senderId });
    });

    socket.on('stopTyping', ({ senderId, receiverId }) => {
      const room = [senderId, receiverId].sort().join('_');
      socket.to(room).emit('stopTyping', { senderId });
    });

    // Disconnect
    socket.on('disconnect', () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
      console.log('❌ User disconnected:', socket.id);
    });
  });
}

module.exports = socketController;
