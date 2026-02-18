const express = require('express');
const Message = require('../models/Message');
const User = require('../models/users');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Get chat messages between current user and another user
router.get('/:userId', authenticateJWT, async (req, res) => {
  try {
    const otherUser = await User.findById(req.params.userId).select('username fullname dp email isPrivate');
    if (!otherUser) return res.status(404).json({ success: false, message: 'User not found' });

    // Check messaging permissions
    const currentUser = await User.findById(req.user._id);
    const canMessage =
      currentUser.following.includes(otherUser._id) || !otherUser.isPrivate;

    if (!canMessage) {
      return res.status(403).json({
        success: false,
        message: otherUser.isPrivate
          ? 'You must follow this private account to send them messages'
          : 'You must follow this user to send them messages',
      });
    }

    // Mark messages as seen
    await Message.updateMany(
      { sender: otherUser._id, receiver: req.user._id, seen: false },
      { seen: true }
    );

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username fullname dp')
      .populate('receiver', 'username fullname dp');

    res.json({ success: true, otherUser, messages });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ success: false, message: 'Error loading chat' });
  }
});

// Send message
router.post('/:userId/send', authenticateJWT, async (req, res) => {
  try {
    const receiverUser = await User.findById(req.params.userId).select('isPrivate');
    if (!receiverUser) return res.status(404).json({ success: false, message: 'User not found' });

    const currentUser = await User.findById(req.user._id);
    const canMessage =
      currentUser.following.includes(receiverUser._id) || !receiverUser.isPrivate;

    if (!canMessage) {
      return res.status(403).json({ success: false, message: 'Cannot send message to this user' });
    }

    const newMessage = new Message({
      sender: req.user._id,
      receiver: receiverUser._id,
      text: req.body.text,
    });
    await newMessage.save();

    const populated = await Message.findById(newMessage._id)
      .populate('sender', 'username fullname dp')
      .populate('receiver', 'username fullname dp');

    res.status(201).json({ success: true, message: populated });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, message: 'Error sending message' });
  }
});

// Delete entire chat
router.delete('/:userId', authenticateJWT, async (req, res) => {
  try {
    await Message.deleteMany({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id },
      ],
    });
    res.json({ success: true, message: 'Chat deleted' });
  } catch (err) {
    console.error('Delete chat error:', err);
    res.status(500).json({ success: false, message: 'Error deleting chat' });
  }
});

module.exports = router;
