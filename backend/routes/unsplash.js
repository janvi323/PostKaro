const express = require('express');
const axios = require('axios');

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
    const perPage = 20; // number of photos per page

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
    } else {
      // Curated photos endpoint – returns an array directly
      const { data } = await axios.get(`${UNSPLASH_BASE_URL}/photos`, {
        headers,
        params: { page, per_page: perPage, order_by: 'popular' },
      });
      photos = data;
    }

    return res.json({ success: true, photos });
  } catch (error) {
    console.error('Unsplash API error:', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch photos from Unsplash',
    });
  }
});

module.exports = router;
