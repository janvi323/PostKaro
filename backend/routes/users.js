const express = require('express');
const User = require('../models/users');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/search?query=
router.get('/search', authenticateJWT, async (req, res) => {
  try {
    const query = req.query.query;
    if (!query || !query.trim()) {
      return res.json({ success: true, users: [] });
    }

    const regex = { $regex: query.trim(), $options: 'i' };

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: regex },
            { fullname: regex },
          ],
        },
      ],
    })
      .select('username fullname dp bio isPrivate followers')
      .limit(10);

    const results = users.map((u) => ({
      _id: u._id,
      username: u.username,
      fullname: u.fullname,
      dp: u.dp,
      bio: u.bio,
      isPrivate: u.isPrivate,
      followersCount: u.followers?.length || 0,
    }));

    res.json({ success: true, users: results });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
