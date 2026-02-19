const express = require('express');
const User = require('../models/users');
const Post = require('../models/posts');
const Message = require('../models/Message');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Home / Feed — get recent posts
router.get('/feed', authenticateJWT, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('user', 'username fullname dp')
      .populate('comments.user', 'username fullname dp')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments();
    const hasMore = skip + posts.length < totalPosts;

    res.json({ success: true, posts, hasMore, currentPage: page, totalPosts });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ success: false, message: 'Error loading feed' });
  }
});

// Explore
router.get('/explore', authenticateJWT, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('user', 'username fullname dp')
      .populate('comments.user', 'username fullname dp')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments();
    const hasMore = skip + posts.length < totalPosts;

    res.json({ success: true, posts, hasMore, currentPage: page, totalPosts });
  } catch (err) {
    console.error('Explore error:', err);
    res.status(500).json({ success: false, message: 'Error loading explore' });
  }
});

// Dashboard — current user's posts
router.get('/dashboard', authenticateJWT, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user._id })
      .populate('user', 'username fullname dp')
      .populate('comments.user', 'username fullname dp')
      .sort({ createdAt: -1 });

    res.json({ success: true, posts });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Error loading dashboard' });
  }
});

// Search users
router.get('/search-users', authenticateJWT, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json({ success: true, users: [] });

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { fullname: { $regex: query, $options: 'i' } },
          ],
        },
      ],
    })
      .select('username fullname dp bio isPrivate followers following')
      .limit(20);

    const currentUser = await User.findById(req.user._id);
    const usersWithStatus = users.map((u) => {
      let followStatus = 'not_following';
      if (currentUser.following.includes(u._id)) followStatus = 'following';
      else if (currentUser.sentRequests.includes(u._id)) followStatus = 'requested';
      return {
        ...u.toObject(),
        followStatus,
        followersCount: u.followers?.length || 0,
        followingCount: u.following?.length || 0,
      };
    });

    res.json({ success: true, users: usersWithStatus });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Notification counts
router.get('/notification-counts', authenticateJWT, async (req, res) => {
  try {
    const unreadMessages = await Message.countDocuments({
      receiver: req.user._id,
      seen: false,
    });
    const user = await User.findById(req.user._id).select('followRequests');
    const followRequestsCount = user?.followRequests?.length || 0;

    res.json({ success: true, messages: unreadMessages, notifications: followRequestsCount });
  } catch (err) {
    console.error('Notification counts error:', err);
    res.json({ success: true, messages: 0, notifications: 0 });
  }
});

// Save / Unsave post
router.post('/post/:id/save', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isSaved = user.savedPosts.includes(req.params.id);
    if (isSaved) {
      user.savedPosts.pull(req.params.id);
    } else {
      user.savedPosts.push(req.params.id);
    }
    await user.save();

    res.json({ success: true, saved: !isSaved, message: isSaved ? 'Post unsaved' : 'Post saved' });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ success: false, message: 'Error saving post' });
  }
});

module.exports = router;
