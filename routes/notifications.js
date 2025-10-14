const express = require('express');
const router = express.Router();
const User = require('../models/users');

// Get notifications page
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/');
    }

    // Get current user with follow requests populated
    const currentUser = await User.findById(req.user._id)
      .populate('followRequests', 'username profilePicture bio')
      .populate('sentRequests', 'username profilePicture bio');

    res.render('notifications', {
      user: req.user,
      followRequests: currentUser.followRequests || [],
      sentRequests: currentUser.sentRequests || [],
      title: 'Notifications'
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).render('error', { message: 'Error loading notifications' });
  }
});

// Accept follow request
router.post('/accept-request/:userId', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const requesterId = req.params.userId;
    const currentUserId = req.user._id;

    // Add to following/followers and remove from requests
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { followers: requesterId },
      $pull: { followRequests: requesterId }
    });

    await User.findByIdAndUpdate(requesterId, {
      $addToSet: { following: currentUserId },
      $pull: { sentRequests: currentUserId }
    });

    res.json({ success: true, message: 'Follow request accepted' });
  } catch (error) {
    console.error('Error accepting follow request:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Decline follow request
router.post('/decline-request/:userId', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const requesterId = req.params.userId;
    const currentUserId = req.user._id;

    // Remove from requests
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { followRequests: requesterId }
    });

    await User.findByIdAndUpdate(requesterId, {
      $pull: { sentRequests: currentUserId }
    });

    res.json({ success: true, message: 'Follow request declined' });
  } catch (error) {
    console.error('Error declining follow request:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;