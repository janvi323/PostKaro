const express = require('express');
const User = require('../models/users.js');
const Post = require('../models/posts.js');
const Activity = require('../models/Activity.js');
const router = express.Router();

// Middleware to check if user is admin (you can customize this)
function isAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  
  // For now, any logged-in user can access. You can add admin role check here
  // Example: if (req.user.role !== 'admin') return res.status(403).send('Access denied');
  next();
}

// Admin Dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Get recent activities
    const activities = await Activity.find()
      .populate('actor', 'username fullname dp')
      .populate('target')
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);
    
    // Get summary stats
    const totalActivities = await Activity.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    
    // Get activity counts by type
    const activityCounts = await Activity.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get top active users
    const topUsers = await Activity.aggregate([
      {
        $group: {
          _id: '$actor',
          activityCount: { $sum: 1 }
        }
      },
      { $sort: { activityCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);
    
    res.render('admin/dashboard', {
      activities,
      stats: {
        totalActivities,
        totalUsers,
        totalPosts,
        activityCounts,
        topUsers
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalActivities / limit),
        hasNext: page * limit < totalActivities,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Get activities for specific user
router.get('/user/:userId/activities', isAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const user = await User.findById(userId).select('username fullname dp');
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    const activities = await Activity.find({ actor: userId })
      .populate('target')
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);
    
    const totalActivities = await Activity.countDocuments({ actor: userId });
    
    // Get user's activity summary
    const activitySummary = await Activity.aggregate([
      { $match: { actor: userId } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.render('admin/user-activities', {
      user,
      activities,
      activitySummary,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalActivities / limit),
        hasNext: page * limit < totalActivities,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('User activities error:', error);
    res.status(500).send('Error loading user activities');
  }
});

// Get activities for specific post
router.get('/post/:postId/activities', isAdmin, async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId).populate('user', 'username fullname');
    
    if (!post) {
      return res.status(404).send('Post not found');
    }
    
    const activities = await Activity.find({ target: postId })
      .populate('actor', 'username fullname dp')
      .sort({ timestamp: -1 });
    
    // Get detailed post analytics
    const postAnalytics = {
      likes: post.likes.length,
      comments: post.comments.length,
      views: post.views.length,
      shares: post.shares.length,
      ...post.getEngagementStats()
    };
    
    res.render('admin/post-activities', {
      post,
      activities,
      analytics: postAnalytics
    });
  } catch (error) {
    console.error('Post activities error:', error);
    res.status(500).send('Error loading post activities');
  }
});

// Export activities data (for analytics/reporting)
router.get('/export/activities', isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, action, format = 'json' } = req.query;
    
    let query = {};
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (action) {
      query.action = action;
    }
    
    const activities = await Activity.find(query)
      .populate('actor', 'username fullname')
      .populate('target')
      .sort({ timestamp: -1 });
    
    if (format === 'csv') {
      const csv = convertToCSV(activities);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=activities.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        count: activities.length,
        activities: activities.map(activity => ({
          id: activity._id,
          actor: activity.actor,
          action: activity.action,
          target: activity.target,
          timestamp: activity.timestamp,
          details: activity.details,
          context: activity.context
        }))
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// Real-time activity feed API
router.get('/api/activities/recent', isAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 60000); // last minute
    
    const activities = await Activity.find({
      timestamp: { $gte: since }
    })
    .populate('actor', 'username fullname')
    .sort({ timestamp: -1 })
    .limit(limit);
    
    res.json({
      success: true,
      activities: activities.map(activity => ({
        id: activity._id,
        actor: activity.actor,
        action: activity.actionDescription,
        timestamp: activity.timestamp,
        details: activity.details
      }))
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({ success: false, message: 'Error fetching activities' });
  }
});

// Helper function to convert activities to CSV
function convertToCSV(activities) {
  const headers = ['ID', 'Actor', 'Action', 'Target', 'Timestamp', 'IP Address', 'User Agent'];
  const rows = activities.map(activity => [
    activity._id,
    activity.actor ? activity.actor.username : 'Unknown',
    activity.action,
    activity.target ? activity.target._id : 'N/A',
    activity.timestamp.toISOString(),
    activity.details?.ipAddress || 'Unknown',
    activity.context?.userAgent || 'Unknown'
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

module.exports = router;