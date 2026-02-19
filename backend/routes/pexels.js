/**
 * routes/pexels.js
 *
 * Pexels API proxy — keeps the API key server-side only.
 * The PEXELS_API_KEY env variable is NEVER sent to the frontend.
 *
 * Architecture:
 *   Frontend  →  GET /api/pexels/photos?query=cats&page=1
 *   Backend   →  Pexels API (with secret key)
 *   Backend   →  Returns sanitised JSON to frontend
 *
 * Endpoints:
 *   GET /api/pexels/photos?query=&page=&per_page=
 *   GET /api/pexels/videos?query=&page=&per_page=
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

const PEXELS_BASE = 'https://api.pexels.com/v1';
const PEXELS_VIDEO_BASE = 'https://api.pexels.com/videos';

// ── Helper: build Pexels request headers ──────────────────────────────────────
function pexelsHeaders() {
  const key = process.env.PEXELS_API_KEY;
  if (!key) {
    throw new Error('PEXELS_API_KEY is not configured in environment variables');
  }
  return { Authorization: key };
}

// ── Helper: extract safe pagination info from Pexels response ─────────────────
function paginationMeta(data, perPage) {
  return {
    page: data.page,
    perPage: data.per_page || perPage,
    totalResults: data.total_results,
    hasNextPage: !!data.next_page,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/pexels/photos
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Searches Pexels for photos or returns curated photos when no query is given.
 *
 * Query params:
 *  - query    (string)  – search term (optional; omit for curated)
 *  - page     (number)  – page number, default 1
 *  - per_page (number)  – results per page, default 20, max 80
 */
router.get('/photos', async (req, res) => {
  try {
    const query = (req.query.query || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(80, Math.max(1, parseInt(req.query.per_page, 10) || 20));

    const headers = pexelsHeaders();

    let photos = [];
    let meta = {};

    if (query) {
      // Search endpoint
      const { data } = await axios.get(`${PEXELS_BASE}/search`, {
        headers,
        params: { query, page, per_page: perPage },
      });

      // Normalise to a clean, safe shape (no full Pexels response object forwarded)
      photos = data.photos.map((p) => ({
        id: p.id,
        width: p.width,
        height: p.height,
        url: p.url,
        photographer: p.photographer,
        photographerUrl: p.photographer_url,
        avg_color: p.avg_color,
        src: {
          original: p.src.original,
          large2x: p.src.large2x,
          large: p.src.large,
          medium: p.src.medium,
          small: p.src.small,
        },
        alt: p.alt || '',
      }));

      meta = paginationMeta(data, perPage);
    } else {
      // Curated photos — shown when no search query
      const { data } = await axios.get(`${PEXELS_BASE}/curated`, {
        headers,
        params: { page, per_page: perPage },
      });

      photos = data.photos.map((p) => ({
        id: p.id,
        width: p.width,
        height: p.height,
        url: p.url,
        photographer: p.photographer,
        photographerUrl: p.photographer_url,
        avg_color: p.avg_color,
        src: {
          original: p.src.original,
          large2x: p.src.large2x,
          large: p.src.large,
          medium: p.src.medium,
          small: p.src.small,
        },
        alt: p.alt || '',
      }));

      meta = paginationMeta(data, perPage);
    }

    return res.json({ success: true, photos, meta, query: query || null });
  } catch (err) {
    if (err.message.includes('PEXELS_API_KEY')) {
      console.error('[Pexels] Missing API key');
      return res.status(503).json({
        success: false,
        message: 'Pexels service is not configured. Add PEXELS_API_KEY to server environment.',
      });
    }

    const status = err.response?.status || 500;
    console.error('[Pexels] Photos error:', err.response?.data || err.message);
    return res.status(status).json({
      success: false,
      message: err.response?.data?.error || 'Failed to fetch photos from Pexels',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/pexels/videos
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Searches Pexels for videos or returns popular videos when no query is given.
 *
 * Query params:
 *  - query    (string)  – search term (optional)
 *  - page     (number)  – page number, default 1
 *  - per_page (number)  – results per page, default 15, max 80
 */
router.get('/videos', async (req, res) => {
  try {
    const query = (req.query.query || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(80, Math.max(1, parseInt(req.query.per_page, 10) || 15));

    const headers = pexelsHeaders();

    // Choose the best quality video file available from the Pexels response
    const pickVideoFile = (files) => {
      if (!files?.length) return null;
      // Prefer hd, then sd, then first available
      const hd = files.find((f) => f.quality === 'hd');
      const sd = files.find((f) => f.quality === 'sd');
      return (hd || sd || files[0])?.link || null;
    };

    const normaliseVideo = (v) => ({
      id: v.id,
      width: v.width,
      height: v.height,
      url: v.url,
      image: v.image, // thumbnail
      duration: v.duration,
      user: { name: v.user?.name, url: v.user?.url },
      videoFile: pickVideoFile(v.video_files),
    });

    let videos = [];
    let meta = {};

    if (query) {
      const { data } = await axios.get(`${PEXELS_VIDEO_BASE}/search`, {
        headers,
        params: { query, page, per_page: perPage },
      });

      videos = data.videos.map(normaliseVideo);
      meta = paginationMeta(data, perPage);
    } else {
      // Popular videos — shown when no query
      const { data } = await axios.get(`${PEXELS_VIDEO_BASE}/popular`, {
        headers,
        params: { page, per_page: perPage },
      });

      videos = data.videos.map(normaliseVideo);
      meta = paginationMeta(data, perPage);
    }

    return res.json({ success: true, videos, meta, query: query || null });
  } catch (err) {
    if (err.message.includes('PEXELS_API_KEY')) {
      console.error('[Pexels] Missing API key');
      return res.status(503).json({
        success: false,
        message: 'Pexels service is not configured. Add PEXELS_API_KEY to server environment.',
      });
    }

    const status = err.response?.status || 500;
    console.error('[Pexels] Videos error:', err.response?.data || err.message);
    return res.status(status).json({
      success: false,
      message: err.response?.data?.error || 'Failed to fetch videos from Pexels',
    });
  }
});

module.exports = router;
