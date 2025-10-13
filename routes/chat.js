const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/users");


// Chat page between two users
router.get("/:userId", async (req, res) => {
  try {
    const otherUser = await User.findById(req.params.userId).select("username fullname dp email");
    if (!otherUser) return res.redirect("/conversations");

    // Mark all messages from this user as seen
    await Message.updateMany(
      { 
        sender: otherUser._id, 
        receiver: req.user._id,
        seen: false 
      },
      { seen: true }
    );

    // Fetch conversation between two users with populated user data
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: req.user._id }
      ]
    })
    .sort({ createdAt: 1 })
    .populate({
      path: "sender",
      select: "username fullname dp"
    })
    .populate({
      path: "receiver", 
      select: "username fullname dp"
    });

    // Ensure otherUser has default profile picture if none exists
    if (!otherUser.dp) {
      otherUser.dp = "/images/default-avatar.png";
    }

    res.render("chat", { 
      currentUser: {
        ...req.user._doc,
        dp: req.user.dp || "/images/default-avatar.png"
      }, 
      otherUser: {
        ...otherUser._doc,
        dp: otherUser.dp || "/images/default-avatar.png"
      }, 
      messages 
    });
  } catch (err) {
    console.error(err);
    res.redirect("/conversations");
  }
});


// Send a message
router.post("/:userId/send", async (req, res) => {
  try {
    // Ensure receiver is the correct ObjectId
    const receiverUser = await User.findById(req.params.userId);
    if (!receiverUser) {
      return res.redirect("/");
    }
    const newMessage = new Message({
      sender: req.user._id,
      receiver: receiverUser._id,
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
