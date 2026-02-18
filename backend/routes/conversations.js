const express = require('express');
const Message = require('../models/Message');
const User = require('../models/users');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Get all conversations
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username fullname dp email isPrivate')
      .populate('receiver', 'username fullname dp email isPrivate');

    let conversations = [];
    let seenUsers = new Set();

    for (let msg of messages) {
      const otherUser = msg.sender._id.equals(req.user._id) ? msg.receiver : msg.sender;
      const canShow = currentUser.following.includes(otherUser._id) || !otherUser.isPrivate;
      if (!canShow) continue;

      if (!seenUsers.has(otherUser._id.toString())) {
        const unreadCount = await Message.countDocuments({
          sender: otherUser._id,
          receiver: req.user._id,
          seen: false,
        });
        const totalMessages = await Message.countDocuments({
          $or: [
            { sender: req.user._id, receiver: otherUser._id },
            { sender: otherUser._id, receiver: req.user._id },
          ],
        });

        conversations.push({
          otherUser: {
            _id: otherUser._id,
            username: otherUser.username,
            fullname: otherUser.fullname,
            dp: otherUser.dp || '/images/default-avatar.svg',
            email: otherUser.email,
          },
          lastMessage: msg,
          unreadCount,
          totalMessages,
          lastMessageTime: msg.createdAt,
        });
        seenUsers.add(otherUser._id.toString());
      }
    }

    conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    res.json({ success: true, conversations });
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ success: false, message: 'Error loading conversations' });
  }
});

// Search users for new conversations
router.get('/search-users', authenticateJWT, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json({ success: true, users: [] });

    const currentUser = await User.findById(req.user._id);
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { _id: { $in: currentUser.following } },
            { isPrivate: { $ne: true } },
          ],
        },
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { fullname: { $regex: query, $options: 'i' } },
          ],
        },
      ],
    })
      .select('username fullname dp email isPrivate')
      .limit(10);

    res.json({ success: true, users });
  } catch (err) {
    console.error('Search users error:', err);
    res.json({ success: true, users: [] });
  }
});

// Mark all as read
router.post('/mark-all-read', authenticateJWT, async (req, res) => {
  try {
    await Message.updateMany({ receiver: req.user._id, seen: false }, { seen: true });
    res.json({ success: true, message: 'All messages marked as read' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ success: false, message: 'Error marking messages as read' });
  }
});

module.exports = router;
