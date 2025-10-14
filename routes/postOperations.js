const express = require('express');
const User = require('../models/users.js');
const Post = require('../models/posts.js');
const upload = require('../controllers/multer.js');

const router = express.Router();

// Middleware
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Helper
const toPublicUrl = (p) => "/" + p.replace(/^public[\\/]/, "").replace(/\\/g, "/");

// Upload Post
router.post("/upload", isLoggedIn, upload.fields([{ name: "file", maxCount: 1 }, { name: "voice", maxCount: 1 }]),
  async (req, res) => {
    try {
      const media = req.files?.file?.[0];
      if (!media) return res.status(400).send("Main media is required");

      const caption = (req.body.caption || "").trim();
      if (!caption) return res.status(400).send("Caption is required");

      const mime = (media.mimetype || "").toLowerCase();
      let fileType;
      if (mime.startsWith("image/")) fileType = "image";
      else if (mime.startsWith("video/")) fileType = "video";
      else return res.status(400).send("Invalid media file");

      const voice = req.files?.voice?.[0] || null;

      const post = new Post({
        fileUrl: toPublicUrl(media.path),
        fileType,
        caption,
        voiceUrl: voice ? toPublicUrl(voice.path) : undefined,
        user: req.user._id,
      });

      await post.save();
      await User.findByIdAndUpdate(req.user._id, { $push: { posts: post._id } });

      res.redirect("/profile");
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).send("Error uploading post");
    }
  }
);

// Delete Post
router.post('/post/:id/delete', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");

    if (!post.user.equals(req.user._id)) return res.status(403).send("Unauthorized");

    await User.findByIdAndUpdate(post.user, { $pull: { posts: post._id } });
    await Post.findByIdAndDelete(req.params.id);

    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Edit Caption
router.post('/post/:id/edit', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");

    if (!post.user.equals(req.user._id)) return res.status(403).send("Unauthorized");

    post.caption = req.body.caption;
    await post.save();

    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Upload/Change DP
router.post("/upload-dp", isLoggedIn, upload.single("dp"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");
    const newDpPath = "/images/dp/" + req.file.filename;
    await User.findByIdAndUpdate(req.user._id, { dp: newDpPath });
    res.redirect("/profile");
  } catch (err) {
    console.error("DP upload error:", err);
    res.status(500).send("Error uploading profile picture");
  }
});

// Delete DP
router.post("/delete-dp", isLoggedIn, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { dp: "/images/default-avatar.png" });
    res.redirect("/profile");
  } catch (err) {
    console.error("DP delete error:", err);
    res.status(500).send("Error deleting profile picture");
  }
});

// Profile route (logged-in user)
router.get('/profile', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("posts")
      .populate("savedPosts")
      .populate("following", "username fullname dp")
      .populate("followers", "username fullname dp")
      .populate("followRequests", "username fullname dp");
  res.render("profile", { 
      user, 
      currentUser: req.user,
      isOwnProfile: true,
      followStatus: 'self'
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).send("Error loading profile");
  }
});

// Follow requests page
router.get('/follow-requests', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("followRequests", "username fullname dp");
      
    res.render("follow-requests", {
      requests: user.followRequests,
      currentUser: req.user
    });
  } catch (err) {
    console.error("Follow requests error:", err);
    res.status(500).send("Error loading follow requests");
  }
});

// Find people page
router.get('/find-people', isLoggedIn, (req, res) => {
  res.render("find-people", {
    currentUser: req.user
  });
});

// Account settings page
router.get('/account-settings', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.render("account-settings", {
      user,
      currentUser: req.user
    });
  } catch (err) {
    console.error("Settings error:", err);
    res.status(500).send("Error loading settings");
  }
});

// Update privacy settings
router.post('/update-privacy', isLoggedIn, async (req, res) => {
  try {
    const { isPrivate, bio, website } = req.body;
    
    await User.findByIdAndUpdate(req.user._id, {
      isPrivate: isPrivate === 'on',
      bio: bio || '',
      website: website || ''
    });

    req.flash('success', 'Settings updated successfully!');
    res.redirect('/profile');
  } catch (err) {
    console.error("Update settings error:", err);
    req.flash('error', 'Error updating settings');
    res.redirect('/account-settings');
  }
});

// Profile by ID
router.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("posts")
      .populate("following", "username fullname dp")
      .populate("followers", "username fullname dp");
      
    if (!user) return res.status(404).send("User not found");

    let followStatus = 'not_following';
    let canMessage = false;
    let canViewPosts = true; // Default for public accounts
    
    if (req.user) {
      const currentUser = await User.findById(req.user._id);
      
      if (currentUser._id.toString() === user._id.toString()) {
        followStatus = 'self';
        canMessage = false; // Can't message yourself
        canViewPosts = true;
      } else if (currentUser.following.includes(user._id)) {
        followStatus = 'following';
        canMessage = true; // Can message if following
        canViewPosts = true; // Can view posts if following
      } else if (currentUser.sentRequests.includes(user._id)) {
        followStatus = 'requested';
        canMessage = false; // Can't message until accepted
        // For private accounts, can't view posts until follow is accepted
        canViewPosts = !user.isPrivate;
      } else {
        followStatus = 'not_following';
        // Public accounts: can message and view posts
        // Private accounts: need to follow first
        if (user.isPrivate) {
          canMessage = false;
          canViewPosts = false; // Hide posts for private accounts
        } else {
          canMessage = true; // Public accounts allow messaging
          canViewPosts = true;
        }
      }
    } else {
      // Not logged in
      canMessage = false;
      canViewPosts = !user.isPrivate; // Only public account posts visible
    }

    res.render("profile", {
      user,
      currentUser: req.user || null,
      isOwnProfile: req.user && req.user._id.toString() === user._id.toString(),
      followStatus,
      canMessage,
      canViewPosts
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
// Save Post
router.post('/post/:id/save', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");

    await User.findByIdAndUpdate(req.user._id, { 
      $addToSet: { savedPosts: post._id }  // prevents duplicates
    });

    res.redirect('back'); // goes back to same page
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving post");
  }
});

// Unsave Post
router.post('/post/:id/unsave', isLoggedIn, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { 
      $pull: { savedPosts: req.params.id }
    });

    res.redirect('back');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error unsaving post");
  }
});


module.exports = router;
