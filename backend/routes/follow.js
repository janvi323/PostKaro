const express = require('express');
const User = require('../models/users');
const Activity = require('../models/Activity');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
  userAgent: req.get('User-Agent') || 'unknown',
});

// Follow
router.post('/follow/:userId', authenticateJWT, async (req, res) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.userId;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (currentUser._id.toString() === targetUserId) {
      return res.status(400).json({ success: false, message: "You can't follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    if (currentUser.following.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Already following this user' });
    }
    if (currentUser.sentRequests.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Follow request already sent' });
    }

    if (targetUser.isPrivate) {
      await User.findByIdAndUpdate(currentUser._id, { $addToSet: { sentRequests: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $addToSet: { followRequests: currentUser._id } });

      await Activity.create({
        actor: currentUser._id,
        action: 'send_follow_request',
        target: targetUserId,
        targetModel: 'User',
        details: { targetUsername: targetUser.username, isPrivateAccount: true, ipAddress },
        context: { userAgent, deviceType: Activity.getDeviceType(userAgent) },
      });

      res.json({ success: true, message: 'Follow request sent', status: 'requested', isPrivate: true });
    } else {
      await User.findByIdAndUpdate(currentUser._id, { $addToSet: { following: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUser._id } });
      res.json({ success: true, message: 'Now following', status: 'following', isPrivate: false });
    }
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Unfollow
router.post('/unfollow/:userId', authenticateJWT, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { following: req.params.userId, sentRequests: req.params.userId },
    });
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { followers: req.user._id, followRequests: req.user._id },
    });
    res.json({ success: true, message: 'Unfollowed successfully', status: 'not_following' });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Accept request
router.post('/accept-request/:userId', authenticateJWT, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser.followRequests.includes(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'No pending request from this user' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { followRequests: req.params.userId },
      $addToSet: { followers: req.params.userId },
    });
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { sentRequests: req.user._id },
      $addToSet: { following: req.user._id },
    });
    res.json({ success: true, message: 'Follow request accepted', status: 'following' });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Decline request
router.post('/decline-request/:userId', authenticateJWT, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { followRequests: req.params.userId } });
    await User.findByIdAndUpdate(req.params.userId, { $pull: { sentRequests: req.user._id } });
    res.json({ success: true, message: 'Follow request declined', status: 'not_following' });
  } catch (error) {
    console.error('Decline request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Follow status
router.get('/status/:userId', authenticateJWT, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    if (currentUser._id.toString() === req.params.userId) return res.json({ status: 'self' });

    let status = 'not_following';
    if (currentUser.following.includes(req.params.userId)) status = 'following';
    else if (currentUser.sentRequests.includes(req.params.userId)) status = 'requested';
    res.json({ status });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get followers
router.get('/followers/:userId', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('followers', 'username fullname dp').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, followers: user.followers, count: user.followers.length });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get following
router.get('/following/:userId', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('following', 'username fullname dp').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, following: user.following, count: user.following.length });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get follow requests
router.get('/requests', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('followRequests', 'username fullname dp').lean();
    res.json({ success: true, requests: user.followRequests, count: user.followRequests.length });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Can message
router.get('/can-message/:userId', authenticateJWT, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(req.params.userId).select('isPrivate');
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    let canMessage = currentUser.following.includes(targetUser._id) || !targetUser.isPrivate;
    res.json({ success: true, canMessage, isPrivate: targetUser.isPrivate });
  } catch (error) {
    console.error('Can message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Search users
router.get('/search', authenticateJWT, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, users: [] });

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { $or: [{ username: { $regex: q, $options: 'i' } }, { fullname: { $regex: q, $options: 'i' } }] },
      ],
    })
      .select('username fullname dp followers following')
      .limit(20)
      .lean();

    const currentUser = await User.findById(req.user._id);
    const usersWithStatus = users.map((user) => {
      let status = 'not_following';
      if (currentUser.following.includes(user._id)) status = 'following';
      else if (currentUser.sentRequests.includes(user._id)) status = 'requested';
      return { ...user, followStatus: status, followersCount: user.followers?.length || 0 };
    });

    res.json({ success: true, users: usersWithStatus });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
