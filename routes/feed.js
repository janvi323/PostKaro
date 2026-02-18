const express = require('express');
const User = require('../models/users.js');
const Post = require('../models/posts.js');

const router = express.Router();

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Home Page - Pinterest-style landing page
router.get('/', isLoggedIn, async (req, res) => {
  try {
    const limit = 24; // Optimized initial load for infinite scroll
    const posts = await Post.find()
      .populate("user", "username fullname dp")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.render("home", { posts, user: req.user });
  } catch (err) {
    console.error("Home error:", err);
    res.status(500).send("Error loading home");
  }
});

// Feed Page
router.get('/feed', isLoggedIn, async (req, res) => {
  try {
    const limit = 24; // Optimized initial load for infinite scroll
    const posts = await Post.find()
      .populate("user", "username fullname dp")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.render("feed", { posts, user: req.user });
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).send("Error loading feed");
  }
});

// Explore Page - Pinterest style discover
router.get('/explore', isLoggedIn, async (req, res) => {
  try {
    const limit = 24; // Initial load limit for better infinite scroll
    const posts = await Post.find()
      .populate("user", "username fullname dp")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.render("explore", { posts, user: req.user });
  } catch (err) {
    console.error("Explore error:", err);
    res.status(500).send("Error loading explore");
  }
});

// Dashboard Page - User's own posts
router.get('/dashboard', isLoggedIn, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user._id })
      .populate("user", "username fullname dp")
      .sort({ createdAt: -1 });

    res.render("dashboard", { posts, user: req.user });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// Save / Unsave Post
router.post('/post/:id/save', isLoggedIn, async (req, res) => {
  try {
    const postId = req.params.id;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).send("User not found");

    if (user.savedPosts.includes(postId)) {
      user.savedPosts.pull(postId); // unsave
    } else {
      user.savedPosts.push(postId); // save
    }

    await user.save();
    res.redirect('/feed');
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).send("Error saving post");
  }
});


// Search users
router.get("/search-users", async (req, res) => {
  try {
    const query = req.query.q;

      if (!query) return res.json([]);

    // Case-insensitive search in username or fullname
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { fullname: { $regex: query, $options: "i" } }
      ]
    });
res.json(users);
    
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// API endpoint for infinite scroll pagination
router.get("/api/posts", isLoggedIn, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate("user", "username fullname dp")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments();
    const hasMore = skip + posts.length < totalPosts;

    res.json({
      posts,
      hasMore,
      currentPage: page,
      totalPosts
    });
  } catch (err) {
    console.error("Posts API error:", err);
    res.status(500).json({ error: "Error loading posts" });
  }
});

// API endpoint for explore infinite scroll pagination
router.get("/api/explore", isLoggedIn, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const skip = (page - 1) * limit;

    // For explore, we can add different sorting or filtering logic
    const posts = await Post.find()
      .populate("user", "username fullname dp")
      .sort({ createdAt: -1 }) // Could be changed to sort by popularity, likes, etc.
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments();
    const hasMore = skip + posts.length < totalPosts;

    res.json({
      posts,
      hasMore,
      currentPage: page,
      totalPosts
    });
  } catch (err) {
    console.error("Explore API error:", err);
    res.status(500).json({ error: "Error loading explore posts" });
  }
});

// Get notification counts
router.get("/notification-counts", isLoggedIn, async (req, res) => {
  try {
    const Message = require('../models/Message');
    
    // Count unread messages (messages where current user is receiver and not seen)
    const unreadMessages = await Message.countDocuments({
      receiver: req.user._id,
      seen: false
    });

    // Get actual follow request notifications
    const user = await User.findById(req.user._id).select('followRequests');
    const followRequestsCount = user ? (user.followRequests ? user.followRequests.length : 0) : 0;

    res.json({
      messages: unreadMessages || 0,
      notifications: followRequestsCount || 0
    });
  } catch (err) {
    console.error("Notification counts error:", err);
    res.json({ messages: 0, notifications: 0 });
  }
});


module.exports = router;
