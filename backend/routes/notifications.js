const express = require('express');
const User = require('../models/users');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Get notifications
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id)
      .populate('followRequests', 'username fullname dp bio')
      .populate('sentRequests', 'username fullname dp bio');

    res.json({
      success: true,
      followRequests: currentUser.followRequests || [],
      sentRequests: currentUser.sentRequests || [],
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ success: false, message: 'Error loading notifications' });
  }
});

// Accept follow request
router.post('/accept-request/:userId', authenticateJWT, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { followers: req.params.userId },
      $pull: { followRequests: req.params.userId },
    });
    await User.findByIdAndUpdate(req.params.userId, {
      $addToSet: { following: req.user._id },
      $pull: { sentRequests: req.user._id },
    });
    res.json({ success: true, message: 'Follow request accepted' });
  } catch (error) {
    console.error('Accept error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Decline follow request
router.post('/decline-request/:userId', authenticateJWT, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { followRequests: req.params.userId } });
    await User.findByIdAndUpdate(req.params.userId, { $pull: { sentRequests: req.user._id } });
    res.json({ success: true, message: 'Follow request declined' });
  } catch (error) {
    console.error('Decline error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
