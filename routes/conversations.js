// routes/conversations.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/users");

// Show all conversations for current user
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    })
      .sort({ createdAt: -1 })
      .populate("sender receiver");

    let conversations = [];
    let seenUsers = new Set();

    for (let msg of messages) {
      const otherUser = msg.sender._id.equals(req.user._id) ? msg.receiver : msg.sender;

      if (!seenUsers.has(otherUser._id.toString())) {
        conversations.push({ otherUser, lastMessage: msg });
        seenUsers.add(otherUser._id.toString());
      }
    }

    res.render("conversations", { conversations });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

module.exports = router;
