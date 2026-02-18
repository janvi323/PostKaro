const express = require('express');
const User = require('../models/users');
const Post = require('../models/posts');
const Activity = require('../models/Activity');
const upload = require('../middleware/multer');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

const toPublicUrl = (p) => '/' + p.replace(/^.*?public[\\/]/, '').replace(/\\/g, '/');
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
  userAgent: req.get('User-Agent') || 'unknown',
});

// Like
router.post('/:id/like', authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const { ipAddress, userAgent } = getClientInfo(req);
    const liked = post.addLike(req.user._id, ipAddress, userAgent);
    if (liked) {
      await post.save();
      await Activity.logLike(req.user._id, post._id, userAgent, ipAddress);
    }
    res.json({ success: true, liked, likesCount: post.likesCount });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Unlike
router.post('/:id/unlike', authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const unliked = post.removeLike(req.user._id);
    if (unliked) await post.save();
    res.json({ success: true, unliked, likesCount: post.likesCount });
  } catch (err) {
    console.error('Unlike error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Comment
router.post('/:id/comment', authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text required' });

    const { ipAddress, userAgent } = getClientInfo(req);
    const comment = post.addComment(req.user._id, text.trim(), ipAddress, userAgent);
    await post.save();
    await post.populate('comments.user', 'username fullname dp');
    await Activity.logComment(req.user._id, post._id, text.trim(), comment._id, userAgent, ipAddress);

    const savedComment = post.comments.id(comment._id);
    res.json({
      success: true,
      comment: savedComment,
      commentsCount: post.commentsCount,
    });
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete comment
router.delete('/:postId/comment/:commentId', authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    if (!comment.user.equals(req.user._id) && !post.user.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    comment.deleteOne();
    await post.save();
    res.json({ success: true, commentsCount: post.commentsCount });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Track view
router.post('/:id/view', authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const { ipAddress, userAgent } = getClientInfo(req);
    post.addView(req.user._id, ipAddress, userAgent, req.body.duration || 0);
    await post.save();
    res.json({ success: true, viewsCount: post.viewsCount });
  } catch (err) {
    console.error('View error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Share
router.post('/:id/share', authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const { ipAddress } = getClientInfo(req);
    post.shares.push({ user: req.user._id, platform: req.body.platform || 'copy_link', ipAddress });
    await post.save();
    res.json({ success: true, sharesCount: post.sharesCount });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Analytics
router.get('/:id/analytics', authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'username');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (!post.user._id.equals(req.user._id)) return res.status(403).json({ success: false, message: 'Unauthorized' });

    res.json({ success: true, analytics: post.getEngagementStats() });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upload post
router.post(
  '/upload',
  authenticateJWT,
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'voice', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const media = req.files?.file?.[0];
      if (!media) return res.status(400).json({ success: false, message: 'Main media is required' });

      const caption = (req.body.caption || '').trim();

      const mime = (media.mimetype || '').toLowerCase();
      let fileType;
      if (mime.startsWith('image/')) fileType = 'image';
      else if (mime.startsWith('video/')) fileType = 'video';
      else return res.status(400).json({ success: false, message: 'Invalid media file' });

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
          uploadedFrom: Activity.getDeviceType(userAgent),
        },
      });

      await post.save();
      await User.findByIdAndUpdate(req.user._id, { $push: { posts: post._id } });

      await Activity.create({
        actor: req.user._id,
        action: 'create_post',
        target: post._id,
        targetModel: 'Post',
        details: { postCaption: caption, postType: fileType, fileSize: media.size, hasVoice: !!voice, ipAddress },
        context: { userAgent, deviceType: Activity.getDeviceType(userAgent) },
      });

      const populatedPost = await Post.findById(post._id).populate('user', 'username fullname dp');
      res.status(201).json({ success: true, message: 'Post created', post: populatedPost });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ success: false, message: 'Error uploading post' });
    }
  }
);

// Delete post
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (!post.user.equals(req.user._id)) return res.status(403).json({ success: false, message: 'Unauthorized' });

    await User.findByIdAndUpdate(post.user, { $pull: { posts: post._id } });
    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Edit caption
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (!post.user.equals(req.user._id)) return res.status(403).json({ success: false, message: 'Unauthorized' });

    post.caption = req.body.caption;
    await post.save();
    res.json({ success: true, message: 'Post updated', post });
  } catch (err) {
    console.error('Edit error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single post
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username fullname dp')
      .populate('comments.user', 'username fullname dp');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, post });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
