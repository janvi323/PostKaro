const express = require('express');
const User = require('../models/users');
const Post = require('../models/posts');
const { authenticateJWT, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/multer');

const router = express.Router();

// Get own profile
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'posts',
        populate: [
          { path: 'user', select: 'username fullname dp' },
          { path: 'comments.user', select: 'username fullname dp' },
        ],
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: 'savedPosts',
        populate: [
          { path: 'user', select: 'username fullname dp' },
          { path: 'comments.user', select: 'username fullname dp' },
        ],
      })
      .populate('following', 'username fullname dp')
      .populate('followers', 'username fullname dp')
      .populate('followRequests', 'username fullname dp')
      .select('-hash -salt');

    res.json({ success: true, user, isOwnProfile: true });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ success: false, message: 'Error loading profile' });
  }
});

// Get profile by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: 'posts',
        populate: [
          { path: 'user', select: 'username fullname dp' },
          { path: 'comments.user', select: 'username fullname dp' },
        ],
        options: { sort: { createdAt: -1 } },
      })
      .populate('following', 'username fullname dp')
      .populate('followers', 'username fullname dp')
      .select('-hash -salt');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let followStatus = 'not_following';
    let canMessage = false;
    let canViewPosts = true;
    let isOwnProfile = false;

    if (req.user) {
      const currentUser = await User.findById(req.user._id);
      if (currentUser._id.toString() === user._id.toString()) {
        followStatus = 'self';
        isOwnProfile = true;
      } else if (currentUser.following.includes(user._id)) {
        followStatus = 'following';
        canMessage = true;
      } else if (currentUser.sentRequests.includes(user._id)) {
        followStatus = 'requested';
        canViewPosts = !user.isPrivate;
      } else {
        canViewPosts = !user.isPrivate;
        canMessage = !user.isPrivate;
      }
    } else {
      canViewPosts = !user.isPrivate;
    }

    res.json({ success: true, user, followStatus, canMessage, canViewPosts, isOwnProfile });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update profile settings
router.put('/settings', authenticateJWT, async (req, res) => {
  try {
    const { isPrivate, bio, website } = req.body;
    const updates = {};
    if (typeof isPrivate === 'boolean') updates.isPrivate = isPrivate;
    if (bio !== undefined) updates.bio = bio;
    if (website !== undefined) updates.website = website;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-hash -salt');
    res.json({ success: true, message: 'Settings updated', user });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ success: false, message: 'Error updating settings' });
  }
});

// Upload / change DP
router.post('/upload-dp', authenticateJWT, upload.single('dp'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const newDp = '/images/dp/' + req.file.filename;
    const user = await User.findByIdAndUpdate(req.user._id, { dp: newDp }, { new: true }).select('-hash -salt');
    res.json({ success: true, message: 'Profile picture updated', dp: user.dp });
  } catch (err) {
    console.error('DP upload error:', err);
    res.status(500).json({ success: false, message: 'Error uploading profile picture' });
  }
});

// Delete DP
router.delete('/delete-dp', authenticateJWT, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { dp: '/images/default-avatar.svg' });
    res.json({ success: true, message: 'Profile picture removed', dp: '/images/default-avatar.svg' });
  } catch (err) {
    console.error('DP delete error:', err);
    res.status(500).json({ success: false, message: 'Error deleting profile picture' });
  }
});

module.exports = router;
