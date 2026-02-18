const express = require('express');
const User = require('../models/users.js');
const Post = require('../models/posts.js');
const Activity = require('../models/Activity.js');
const upload = require('../controllers/multer.js');

const router = express.Router();

// Middleware
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Helper
const toPublicUrl = (p) => "/" + p.replace(/^public[\\/]/, "").replace(/\\/g, "/");

// Helper function to get client info
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown',
  userAgent: req.get('User-Agent') || 'unknown'
});

// ================== POST INTERACTION ROUTES ==================

// Like a post
router.post('/post/:id/like', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const { ipAddress, userAgent } = getClientInfo(req);
    const userId = req.user._id;

    // Add like using the enhanced method
    const liked = post.addLike(userId, ipAddress, userAgent);
    
    if (liked) {
      await post.save();
      
      // Log activity
      await Activity.logLike(userId, post._id, userAgent, ipAddress);
      
      res.json({ 
        success: true, 
        message: 'Post liked',
        likesCount: post.likesCount 
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Already liked',
        likesCount: post.likesCount 
      });
    }
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Unlike a post
router.post('/post/:id/unlike', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const { ipAddress, userAgent } = getClientInfo(req);
    const userId = req.user._id;

    // Remove like using the enhanced method
    const unliked = post.removeLike(userId);
    
    if (unliked) {
      await post.save();
      
      // Log activity
      await Activity.create({
        actor: userId,
        action: 'unlike_post',
        target: post._id,
        targetModel: 'Post',
        details: { ipAddress },
        context: { userAgent, deviceType: Activity.getDeviceType(userAgent) }
      });
      
      res.json({ 
        success: true, 
        message: 'Post unliked',
        likesCount: post.likesCount 
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Not liked yet',
        likesCount: post.likesCount 
      });
    }
  } catch (err) {
    console.error('Unlike error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add comment to post
router.post('/post/:id/comment', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment text required' });
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    const userId = req.user._id;

    // Add comment using the enhanced method
    const comment = post.addComment(userId, text.trim(), ipAddress, userAgent);
    await post.save();
    
    // Populate the comment user info for response
    await post.populate('comments.user', 'username fullname dp');
    
    // Log activity
    await Activity.logComment(userId, post._id, text.trim(), comment._id, userAgent, ipAddress);
    
    res.json({ 
      success: true, 
      message: 'Comment added',
      comment: {
        _id: comment._id,
        text: comment.text,
        user: comment.user,
        createdAt: comment.createdAt
      },
      commentsCount: post.commentsCount 
    });
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete comment
router.delete('/post/:postId/comment/:commentId', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    // Check if user owns the comment or the post
    if (!comment.user.equals(req.user._id) && !post.user.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    
    // Remove comment
    comment.remove();
    await post.save();
    
    // Log activity
    await Activity.create({
      actor: req.user._id,
      action: 'delete_comment',
      target: post._id,
      targetModel: 'Post',
      details: { 
        commentId: req.params.commentId,
        commentText: comment.text,
        ipAddress 
      },
      context: { userAgent, deviceType: Activity.getDeviceType(userAgent) }
    });
    
    res.json({ 
      success: true, 
      message: 'Comment deleted',
      commentsCount: post.commentsCount 
    });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Track post view
router.post('/post/:id/view', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const { ipAddress, userAgent } = getClientInfo(req);
    const { duration = 0 } = req.body;
    const userId = req.user._id;

    // Add view using the enhanced method
    const viewAdded = post.addView(userId, ipAddress, userAgent, duration);
    
    if (viewAdded) {
      await post.save();
      
      // Log activity
      await Activity.create({
        actor: userId,
        action: 'view_post',
        target: post._id,
        targetModel: 'Post',
        details: { 
          viewDuration: duration,
          ipAddress 
        },
        context: { userAgent, deviceType: Activity.getDeviceType(userAgent) }
      });
    }
    
    res.json({ 
      success: true, 
      viewsCount: post.viewsCount 
    });
  } catch (err) {
    console.error('View tracking error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Share post
router.post('/post/:id/share', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const { platform = 'copy_link' } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);
    const userId = req.user._id;

    // Add share
    post.shares.push({
      user: userId,
      sharedAt: new Date(),
      platform,
      ipAddress
    });
    
    await post.save();
    
    // Log activity
    await Activity.create({
      actor: userId,
      action: 'share_post',
      target: post._id,
      targetModel: 'Post',
      details: { 
        platform,
        ipAddress 
      },
      context: { userAgent, deviceType: Activity.getDeviceType(userAgent) }
    });
    
    res.json({ 
      success: true, 
      message: 'Post shared',
      sharesCount: post.sharesCount 
    });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get post analytics
router.get('/post/:id/analytics', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'username');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Check if user owns the post
    if (!post.user._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const stats = post.getEngagementStats();
    
    res.json({ 
      success: true, 
      analytics: {
        ...stats,
        post: {
          id: post._id,
          caption: post.caption,
          createdAt: post.createdAt
        }
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ================== EXISTING ROUTES ==================

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
      const { ipAddress, userAgent } = getClientInfo(req);

      const post = new Post({
        fileUrl: toPublicUrl(media.path),
        fileType,
        caption,
        voiceUrl: voice ? toPublicUrl(voice.path) : undefined,
        user: req.user._id,
        metadata: {
          originalFileName: media.originalname,
          fileSize: media.size,
          uploadedFrom: Activity.getDeviceType(userAgent)
        }
      });

      await post.save();
      await User.findByIdAndUpdate(req.user._id, { $push: { posts: post._id } });

      // Log activity
      await Activity.create({
        actor: req.user._id,
        action: 'create_post',
        target: post._id,
        targetModel: 'Post',
        details: {
          postCaption: caption,
          postType: fileType,
          fileSize: media.size,
          hasVoice: !!voice,
          ipAddress
        },
        context: { userAgent, deviceType: Activity.getDeviceType(userAgent) }
      });

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
      
    if (!user) {
      return res.status(404).send("User not found");
    }
      
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
    const { ipAddress, userAgent } = getClientInfo(req);
    
    // Get current user data for comparison
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      req.flash('error', 'User not found');
      return res.redirect('/account-settings');
    }
    
    const oldValues = {
      isPrivate: currentUser.isPrivate,
      bio: currentUser.bio,
      website: currentUser.website
    };
    
    const newValues = {
      isPrivate: isPrivate === 'on',
      bio: bio || '',
      website: website || ''
    };
    
    // Update user
    await User.findByIdAndUpdate(req.user._id, newValues);

    // Log activity for privacy changes
    if (oldValues.isPrivate !== newValues.isPrivate) {
      await Activity.create({
        actor: req.user._id,
        action: 'change_privacy',
        target: req.user._id,
        targetModel: 'User',
        details: {
          oldPrivacy: oldValues.isPrivate ? 'private' : 'public',
          newPrivacy: newValues.isPrivate ? 'private' : 'public',
          ipAddress
        },
        context: { userAgent, deviceType: Activity.getDeviceType(userAgent) }
      });
    }
    
    // Log profile update activity
    const changedFields = [];
    if (oldValues.bio !== newValues.bio) changedFields.push('bio');
    if (oldValues.website !== newValues.website) changedFields.push('website');
    
    if (changedFields.length > 0) {
      await Activity.create({
        actor: req.user._id,
        action: 'update_profile',
        target: req.user._id,
        targetModel: 'User',
        details: {
          changedFields,
          oldValues: Object.fromEntries(changedFields.map(field => [field, oldValues[field]])),
          newValues: Object.fromEntries(changedFields.map(field => [field, newValues[field]])),
          ipAddress
        },
        context: { userAgent, deviceType: Activity.getDeviceType(userAgent) }
      });
    }

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
