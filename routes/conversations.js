// routes/conversations.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/users");

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Show all conversations for current user
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "sender",
        select: "username fullname dp email"
      })
      .populate({
        path: "receiver", 
        select: "username fullname dp email"
      });

    let conversations = [];
    let seenUsers = new Set();

    for (let msg of messages) {
      const otherUser = msg.sender._id.equals(req.user._id) ? msg.receiver : msg.sender;

      if (!seenUsers.has(otherUser._id.toString())) {
        // Count unread messages from this specific user
        const unreadCount = await Message.countDocuments({
          sender: otherUser._id,
          receiver: req.user._id,
          seen: false
        });

        // Get total message count between users
        const totalMessages = await Message.countDocuments({
          $or: [
            { sender: req.user._id, receiver: otherUser._id },
            { sender: otherUser._id, receiver: req.user._id }
          ]
        });

        conversations.push({ 
          otherUser: {
            _id: otherUser._id,
            username: otherUser.username,
            fullname: otherUser.fullname,
            dp: otherUser.dp || "/images/default-avatar.png",
            email: otherUser.email
          }, 
          lastMessage: msg,
          unreadCount: unreadCount,
          totalMessages: totalMessages,
          lastMessageTime: msg.createdAt
        });
        seenUsers.add(otherUser._id.toString());
      }
    }

    // Sort conversations by last message time (most recent first)
    conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.render("conversations", { conversations, currentUser: req.user });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// API endpoint to search users for new conversations
router.get("/search-users", isLoggedIn, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.json([]);
    }
    
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { fullname: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username fullname dp email')
    .limit(10);
    
    res.json(users);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// Mark all messages as read
router.post("/mark-all-read", isLoggedIn, async (req, res) => {
  try {
    await Message.updateMany(
      { 
        receiver: req.user._id,
        seen: false 
      },
      { seen: true }
    );
    
    res.json({ success: true, message: "All messages marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error marking messages as read" });
  }
});

module.exports = router;
