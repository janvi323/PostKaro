const express = require('express');
const User = require('../models/users.js');
const Message = require('../models/Message.js');
const router = express.Router();

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ success: false, message: 'Please log in first' });
}

// Follow a user
router.post('/follow/:userId', isLoggedIn, async (req, res) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.userId;
    
    // Don't allow following yourself
    if (currentUser._id.toString() === targetUserId) {
      return res.status(400).json({ success: false, message: "You can't follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already following
    if (currentUser.following.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Already following this user' });
    }

    // Check if there's already a pending request
    if (currentUser.sentRequests.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Follow request already sent' });
    }

    if (targetUser.isPrivate) {
      // Private account - send follow request
      await User.findByIdAndUpdate(currentUser._id, {
        $addToSet: { sentRequests: targetUserId }
      });
      
      await User.findByIdAndUpdate(targetUserId, {
        $addToSet: { followRequests: currentUser._id }
      });

      res.json({ 
        success: true, 
        message: 'Follow request sent', 
        status: 'requested',
        isPrivate: true 
      });
    } else {
      // Public account - follow immediately
      await User.findByIdAndUpdate(currentUser._id, {
        $addToSet: { following: targetUserId }
      });
      
      await User.findByIdAndUpdate(targetUserId, {
        $addToSet: { followers: currentUser._id }
      });

      res.json({ 
        success: true, 
        message: 'Now following', 
        status: 'following',
        isPrivate: false 
      });
    }
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Unfollow a user
router.post('/unfollow/:userId', isLoggedIn, async (req, res) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.userId;

    // Remove from following/followers
    await User.findByIdAndUpdate(currentUser._id, {
      $pull: { following: targetUserId, sentRequests: targetUserId }
    });
    
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: currentUser._id, followRequests: currentUser._id }
    });

    res.json({ 
      success: true, 
      message: 'Unfollowed successfully', 
      status: 'not_following' 
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Accept follow request
router.post('/accept-request/:userId', isLoggedIn, async (req, res) => {
  try {
    const currentUser = req.user;
    const requesterId = req.params.userId;

    // Check if there's a pending request
    if (!currentUser.followRequests.includes(requesterId)) {
      return res.status(400).json({ success: false, message: 'No pending request from this user' });
    }

    // Move from requests to followers/following
    await User.findByIdAndUpdate(currentUser._id, {
      $pull: { followRequests: requesterId },
      $addToSet: { followers: requesterId }
    });
    
    await User.findByIdAndUpdate(requesterId, {
      $pull: { sentRequests: currentUser._id },
      $addToSet: { following: currentUser._id }
    });

    res.json({ 
      success: true, 
      message: 'Follow request accepted',
      status: 'following' 
    });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Decline follow request
router.post('/decline-request/:userId', isLoggedIn, async (req, res) => {
  try {
    const currentUser = req.user;
    const requesterId = req.params.userId;

    await User.findByIdAndUpdate(currentUser._id, {
      $pull: { followRequests: requesterId }
    });
    
    await User.findByIdAndUpdate(requesterId, {
      $pull: { sentRequests: currentUser._id }
    });

    res.json({ 
      success: true, 
      message: 'Follow request declined',
      status: 'not_following' 
    });
  } catch (error) {
    console.error('Decline request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get follow status between current user and target user
router.get('/status/:userId', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const targetUserId = req.params.userId;

    if (currentUser._id.toString() === targetUserId) {
      return res.json({ status: 'self' });
    }

    let status = 'not_following';
    
    if (currentUser.following.includes(targetUserId)) {
      status = 'following';
    } else if (currentUser.sentRequests.includes(targetUserId)) {
      status = 'requested';
    }

    res.json({ status });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's followers
router.get('/followers/:userId', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', 'username fullname dp')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      followers: user.followers,
      count: user.followers.length 
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's following
router.get('/following/:userId', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', 'username fullname dp')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      following: user.following,
      count: user.following.length 
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get pending follow requests
router.get('/requests', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followRequests', 'username fullname dp')
      .lean();

    res.json({ 
      success: true, 
      requests: user.followRequests,
      count: user.followRequests.length 
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Check if user can message another user
router.get('/can-message/:userId', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(req.params.userId).select('isPrivate');
    
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let canMessage = false;
    let reason = '';

    if (currentUser.following.includes(targetUser._id)) {
      // Can message if following
      canMessage = true;
      reason = 'You are following this user';
    } else if (!targetUser.isPrivate) {
      // Can message public accounts without following
      canMessage = true;
      reason = 'This is a public account';
    } else {
      // Cannot message private accounts without following
      canMessage = false;
      reason = 'Must follow this private account to send messages';
    }

    res.json({ 
      success: true, 
      canMessage,
      message: reason,
      isPrivate: targetUser.isPrivate
    });
  } catch (error) {
    console.error('Can message check error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Search users (for follow suggestions)
router.get('/search', isLoggedIn, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { fullname: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username fullname dp followers following')
    .limit(20)
    .lean();

    // Add follow status for each user
    const currentUser = await User.findById(req.user._id);
    const usersWithStatus = users.map(user => {
      let status = 'not_following';
      if (currentUser.following.includes(user._id)) {
        status = 'following';
      } else if (currentUser.sentRequests.includes(user._id)) {
        status = 'requested';
      }
      
      return {
        ...user,
        followStatus: status,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0
      };
    });

    res.json({ success: true, users: usersWithStatus });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;