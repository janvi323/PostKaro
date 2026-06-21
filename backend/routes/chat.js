const express = require('express');
const Message = require('../models/Message');
const User = require('../models/users');
const { authenticateJWT } = require('../middleware/auth');
const { parsePagination, requireObjectId } = require('../utils/request');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/chat/:userId  — load message history
// ---------------------------------------------------------------------------
// BUG FIX: Filter out messages where deletedFor includes the requesting user
// so "Delete for Me" works correctly. Also marks incoming messages as seen.
router.get('/:userId', authenticateJWT, async (req, res) => {
  try {
    if (!requireObjectId(res, req.params.userId, 'userId')) return;

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

    // Mark messages sent by the other user as seen
    await Message.updateMany(
      { sender: otherUser._id, receiver: req.user._id, seen: false },
      { seen: true }
    );

    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: req.user._id },
      ],
      // Feature: "Delete for Me" — exclude messages this user soft-deleted
      deletedFor: { $nin: [req.user._id.toString()] },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username fullname dp')
      .populate('receiver', 'username fullname dp');

    res.json({ success: true, otherUser, messages: messages.reverse(), currentPage: page });
  } catch (err) {
    console.error('[Chat] GET error:', err);
    res.status(500).json({ success: false, message: 'Error loading chat' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/chat/:userId/send  — send a message via REST
// ---------------------------------------------------------------------------
// NOTE: This REST endpoint is a FALLBACK for when the socket is not connected.
// The primary send path is socket.emit('chatMessage', ...).
// Using BOTH paths at once will cause duplicate messages!
router.post('/:userId/send', authenticateJWT, async (req, res) => {
  try {
    if (!requireObjectId(res, req.params.userId, 'userId')) return;

    const receiverUser = await User.findById(req.params.userId).select('isPrivate');
    if (!receiverUser) return res.status(404).json({ success: false, message: 'User not found' });

    const currentUser = await User.findById(req.user._id);
    const canMessage =
      currentUser.following.includes(receiverUser._id) || !receiverUser.isPrivate;

    if (!canMessage) {
      return res.status(403).json({ success: false, message: 'Cannot send message to this user' });
    }

    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ success: false, message: 'Message text is required' });

    const newMessage = new Message({
      sender: req.user._id,
      receiver: receiverUser._id,
      text,
    });
    await newMessage.save();

    const populated = await Message.findById(newMessage._id)
      .populate('sender', 'username fullname dp')
      .populate('receiver', 'username fullname dp');

    res.status(201).json({ success: true, message: populated });
  } catch (err) {
    console.error('[Chat] POST send error:', err);
    res.status(500).json({ success: false, message: 'Error sending message' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/chat/message/:messageId/delete-for-me  — "Delete for Me"
// ---------------------------------------------------------------------------
// Adds the current user's ID to the message's deletedFor array.
// The message stays in the DB but is filtered out for this user going forward.
router.patch('/message/:messageId/delete-for-me', authenticateJWT, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    // Check that the current user is a participant (sender or receiver)
    const meId = req.user._id.toString();
    if (message.sender.toString() !== meId && message.receiver.toString() !== meId) {
      return res.status(403).json({ success: false, message: 'Not your message' });
    }

    // Idempotent: only push if not already in the array
    if (!message.deletedFor.includes(meId)) {
      message.deletedFor.push(meId);
      await message.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Chat] delete-for-me error:', err);
    res.status(500).json({ success: false, message: 'Error deleting message' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/chat/message/:messageId/unsend  — "Delete for Everyone"
// ---------------------------------------------------------------------------
// Only the original sender can unsend. Sets isDeleted = true.
// Frontend should listen for the 'messageDeleted' socket event for real-time
// update; this REST endpoint is a fallback / confirmation path.
router.patch('/message/:messageId/unsend', authenticateJWT, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the sender can unsend a message' });
    }

    message.isDeleted = true;
    await message.save();

    res.json({ success: true });
  } catch (err) {
    console.error('[Chat] unsend error:', err);
    res.status(500).json({ success: false, message: 'Error unsending message' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/chat/:userId  — delete entire chat history
// ---------------------------------------------------------------------------
// Hard-deletes ALL messages between the two users from MongoDB.
// Use soft-delete (deletedFor) for a per-user experience instead.
router.delete('/:userId', authenticateJWT, async (req, res) => {
  try {
    if (!requireObjectId(res, req.params.userId, 'userId')) return;

    await Message.deleteMany({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id },
      ],
    });

    res.json({ success: true, message: 'Chat deleted' });
  } catch (err) {
    console.error('[Chat] DELETE error:', err);
    res.status(500).json({ success: false, message: 'Error deleting chat' });
  }
});

module.exports = router;
