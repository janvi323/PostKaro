const express = require('express');
const User = require('../models/users');
const Post = require('../models/posts');
const Activity = require('../models/Activity');
const upload = require('../middleware/multer');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Convert an absolute disk path returned by Multer into a server-relative URL.
//
// Multer gives us the full OS path, e.g.:
//   Windows: D:\MyProjects\pinterest\backend\public\images\uploads\uuid.jpg
//   Linux:   /opt/render/project/src/backend/public/images/uploads/uuid.jpg
//
// We want: /images/uploads/uuid.jpg
//
// Strategy: normalise backslashes → forward slashes, then extract the portion
// starting at the LAST occurrence of "/public/" so we don't get confused by
// directory names that also contain the word "public" (e.g. "public_html").
const toPublicUrl = (p) => {
  const normalized = p.replace(/\\/g, '/');   // Windows → POSIX separators
  const marker = '/public/';
  const idx = normalized.lastIndexOf(marker);
  if (idx !== -1) {
    // slice from the '/' that starts '/images/...'
    return normalized.slice(idx + marker.length - 1);
  }
  // Fallback: return the last 3 path segments (should never be needed)
  const parts = normalized.split('/').filter(Boolean);
  return '/' + parts.slice(-3).join('/');
};
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
  userAgent: req.get('User-Agent') || 'unknown',
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/posts — list all posts (public; no auth required)
//
// This is the primary route used by the Feed page on page refresh.
// It does NOT require authentication so pages always load correctly even
// when the auth token hasn't been hydrated yet on the client.
//
// Query params:
//   page  (number) – page number, default 1
//   limit (number) – items per page, default 20
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [posts, totalPosts] = await Promise.all([
      Post.find()
        .populate('user', 'username fullname dp')
        .populate('comments.user', 'username fullname dp')
        .sort({ createdAt: -1 }) // newest first
        .skip(skip)
        .limit(limit)
        .lean(), // lean() gives plain JS objects — faster & smaller memory footprint
      Post.countDocuments(),
    ]);

    const hasMore = skip + posts.length < totalPosts;

    return res.json({
      success: true,
      posts,
      hasMore,
      currentPage: page,
      totalPosts,
    });
  } catch (err) {
    console.error('[GET /api/posts] Error loading posts:', err);
    return res.status(500).json({ success: false, message: 'Error loading posts' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/posts/from-url — create a post from an external media URL
//
// Used when the user picks a photo/video from the Pexels modal.
// No file upload; we store the external URL directly.
// The PostCard resolveUrl() helper already handles absolute URLs.
//
// Body:
//   fileUrl   (string, required) – the external media URL (e.g. Pexels CDN)
//   fileType  (string, required) – "image" | "video"
//   caption   (string, optional)
//   source    (string, optional) – e.g. "pexels"
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/from-url', authenticateJWT, async (req, res) => {
  try {
    const { fileUrl, fileType, caption, source } = req.body;

    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('http')) {
      return res.status(400).json({ success: false, message: 'A valid absolute fileUrl is required' });
    }
    if (!['image', 'video'].includes(fileType)) {
      return res.status(400).json({ success: false, message: 'fileType must be "image" or "video"' });
    }

    const { ipAddress, userAgent } = getClientInfo(req);

    const post = new Post({
      fileUrl,
      fileType,
      caption: (caption || '').trim(),
      user: req.user._id,
      metadata: {
        originalFileName: source || 'external',
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
      details: {
        postCaption: post.caption,
        postType: fileType,
        source: source || 'external_url',
        ipAddress,
      },
      context: { userAgent, deviceType: Activity.getDeviceType(userAgent) },
    });

    const populatedPost = await Post.findById(post._id)
      .populate('user', 'username fullname dp');

    console.log(`[POST /from-url] Post created by ${req.user.username} — ${fileType} from ${source || 'url'}`);

    return res.status(201).json({ success: true, message: 'Post created', post: populatedPost });
  } catch (err) {
    console.error('[POST /from-url] Error:', err);
    return res.status(500).json({ success: false, message: 'Error creating post from URL' });
  }
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

// Get single post (public — no auth required)
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username fullname dp')
      .populate('comments.user', 'username fullname dp')
      .lean();
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Fetch related posts: same user first, then fill with recent others — exclude current post
    const [byUser, recent] = await Promise.all([
      Post.find({ _id: { $ne: post._id }, user: post.user._id })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('user', 'username fullname dp')
        .lean(),
      Post.find({ _id: { $ne: post._id }, user: { $ne: post.user._id } })
        .sort({ createdAt: -1 })
        .limit(12)
        .populate('user', 'username fullname dp')
        .lean(),
    ]);

    // Merge: user's own posts first, then pad with recent posts up to 18 total
    const seen = new Set(byUser.map((p) => String(p._id)));
    const related = [
      ...byUser,
      ...recent.filter((p) => !seen.has(String(p._id))),
    ].slice(0, 18);

    res.json({ success: true, post, related });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
