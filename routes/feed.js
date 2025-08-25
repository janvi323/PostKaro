const express = require('express');
const User = require('../models/users.js');
const Post = require('../models/posts.js');

const router = express.Router();

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Feed Page
router.get('/feed', isLoggedIn, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "username dp")
      .sort({ createdAt: -1 });

    res.render("feed", { posts });
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).send("Error loading feed");
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




module.exports = router;
