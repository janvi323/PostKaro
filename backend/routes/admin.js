const express = require('express');
const User = require('../models/users');
const Post = require('../models/posts');
const Activity = require('../models/Activity');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Admin dashboard stats
router.get('/dashboard', authenticateJWT, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const activities = await Activity.find()
      .populate('actor', 'username fullname dp')
      .populate('target')
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);

    const totalActivities = await Activity.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();

    const activityCounts = await Activity.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const topUsers = await Activity.aggregate([
      { $group: { _id: '$actor', activityCount: { $sum: 1 } } },
      { $sort: { activityCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
    ]);

    res.json({
      success: true,
      activities,
      stats: { totalActivities, totalUsers, totalPosts, activityCounts, topUsers },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalActivities / limit),
        hasNext: page * limit < totalActivities,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Error loading dashboard' });
  }
});

// Recent activities API
router.get('/activities/recent', authenticateJWT, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 60000);

    const activities = await Activity.find({ timestamp: { $gte: since } })
      .populate('actor', 'username fullname')
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({
      success: true,
      activities: activities.map((a) => ({
        id: a._id,
        actor: a.actor,
        action: a.actionDescription,
        timestamp: a.timestamp,
        details: a.details,
      })),
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({ success: false, message: 'Error fetching activities' });
  }
});

module.exports = router;
