const express = require('express');
const axios = require('axios');
const UnsplashInteraction = require('../models/UnsplashInteraction');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Unsplash API base URL
const UNSPLASH_BASE_URL = 'https://api.unsplash.com';

/**
 * GET /api/unsplash/photos
 *
 * Proxy route to fetch photos from Unsplash.
 * Keeps the API key hidden on the server side.
 *
 * Query params:
 *   - page  (number)  – page number for pagination (default: 1)
 *   - query (string)  – optional search keyword
 *
 * Returns:
 *   - If query is provided → search results (response.data.results)
 *   - If no query          → curated photo list (response.data)
 */
router.get('/photos', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const query = req.query.query || '';
    // Allow caller to request up to 30 photos per page (Unsplash max is 30)
    const perPage = Math.min(30, Math.max(1, parseInt(req.query.per_page, 10) || 20));

    // Common headers for Unsplash API authentication
    const headers = {
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
    };

    let photos;

    if (query) {
      // Search endpoint – returns { results: [...], total: ..., total_pages: ... }
      const { data } = await axios.get(`${UNSPLASH_BASE_URL}/search/photos`, {
        headers,
        params: { page, per_page: perPage, query },
      });
      photos = data.results;
      return res.json({
        success: true,
        photos,
        hasMore: page < data.total_pages,
        total: data.total,
      });
    } else {
      // Curated photos endpoint – returns an array directly
      const { data } = await axios.get(`${UNSPLASH_BASE_URL}/photos`, {
        headers,
        params: { page, per_page: perPage, order_by: 'popular' },
      });
      photos = data;
      // Unsplash curated list is virtually infinite; signal more as long as we got a full page
      return res.json({
        success: true,
        photos,
        hasMore: photos.length === perPage,
      });
    }
  } catch (error) {
    console.error('Unsplash API error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch photos from Unsplash',
    });
  }
});

// ── Helper: find-or-create the interaction document for a given Unsplash photo ──
async function findOrCreate(unsplashId, body) {
  let doc = await UnsplashInteraction.findOne({ unsplashId });
  if (!doc) {
    doc = new UnsplashInteraction({
      unsplashId,
      photoUrl: body?.photoUrl || '',
      description: body?.description || '',
      photographerName: body?.photographerName || '',
      photographerAvatar: body?.photographerAvatar || '',
      originalLikes: body?.originalLikes || 0,
    });
    await doc.save();
  }
  return doc;
}

/**
 * GET /api/unsplash/:id/interactions
 * Returns like/save status for the logged-in user + comments + counts.
 */
router.get('/:id/interactions', authenticateJWT, async (req, res) => {
  try {
    let doc = await UnsplashInteraction.findOne({ unsplashId: req.params.id })
      .populate('comments.user', 'username fullname dp');
    if (!doc) {
      return res.json({
        success: true,
        liked: false,
        saved: false,
        likesCount: 0,
        comments: [],
      });
    }
    res.json({
      success: true,
      liked: doc.isLikedBy(req.user._id),
      saved: doc.isSavedBy(req.user._id),
      likesCount: doc.likes.length,
      comments: doc.comments,
    });
  } catch (err) {
    console.error('Unsplash interactions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/unsplash/:id/like   — toggle like
 */
router.post('/:id/like', authenticateJWT, async (req, res) => {
  try {
    const doc = await findOrCreate(req.params.id, req.body);
    const alreadyLiked = doc.isLikedBy(req.user._id);
    if (alreadyLiked) {
      doc.likes = doc.likes.filter((l) => !l.user.equals(req.user._id));
    } else {
      doc.likes.push({ user: req.user._id });
    }
    await doc.save();
    res.json({ success: true, liked: !alreadyLiked, likesCount: doc.likes.length });
  } catch (err) {
    console.error('Unsplash like error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/unsplash/:id/save   — toggle save
 */
router.post('/:id/save', authenticateJWT, async (req, res) => {
  try {
    const doc = await findOrCreate(req.params.id, req.body);
    const alreadySaved = doc.isSavedBy(req.user._id);
    if (alreadySaved) {
      doc.saves = doc.saves.filter((id) => !id.equals(req.user._id));
    } else {
      doc.saves.push(req.user._id);
    }
    await doc.save();
    res.json({ success: true, saved: !alreadySaved });
  } catch (err) {
    console.error('Unsplash save error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/unsplash/:id/comment   — add a comment
 */
router.post('/:id/comment', authenticateJWT, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text required' });

    const doc = await findOrCreate(req.params.id, req.body);
    const comment = { user: req.user._id, text: text.trim() };
    doc.comments.push(comment);
    await doc.save();
    await doc.populate('comments.user', 'username fullname dp');

    const saved = doc.comments[doc.comments.length - 1];
    res.json({ success: true, comment: saved });
  } catch (err) {
    console.error('Unsplash comment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * DELETE /api/unsplash/:id/comment/:commentId   — remove a comment
 */
router.delete('/:id/comment/:commentId', authenticateJWT, async (req, res) => {
  try {
    const doc = await UnsplashInteraction.findOne({ unsplashId: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    const comment = doc.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    if (!comment.user.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    comment.deleteOne();
    await doc.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Unsplash delete comment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
