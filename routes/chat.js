const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/users");


// Chat page between two users
router.get("/:userId",  async (req, res) => {
  try {
    const otherUser = await User.findById(req.params.userId);
    if (!otherUser) return res.redirect("/");

    // Fetch messages between the two users
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: req.user._id }
      ]
    })
      .populate("sender", "username fullname")
      .populate("receiver", "username fullname")
      .sort({ createdAt: 1 });

    // Mark all received messages as "seen"
    await Message.updateMany(
      { receiver: req.user._id, sender: otherUser._id, seen: false },
      { $set: { seen: true } }
    );

    res.render("chat", { currentUser: req.user, otherUser, messages });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// Send a message
router.post("/:userId/send", async (req, res) => {
  try {
    const newMessage = new Message({
      sender: req.user._id,
      receiver: req.params.userId,
      text: req.body.text
    });
    await newMessage.save();

    res.redirect(`/chat/${req.params.userId}`);
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// Delete entire chat between current user and other user
router.post("/:userId/delete",  async (req, res) => {
  try {
    await Message.deleteMany({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    });
    res.redirect("/feed");
  } catch (err) {
    console.error(err);
    res.redirect("/feed");
  }
});

module.exports = router;
