/**
 * api.js — Media proxy helpers (Unsplash + Pexels)
 *
 * All requests go to the backend proxy so that API keys stay server-side.
 * The backend routes are:
 *   /api/unsplash/photos   — Unsplash proxy
 *   /api/pexels/photos     — Pexels photos proxy
 *   /api/pexels/videos     — Pexels videos proxy
 *
 * Architecture:
 *   Frontend → /api/pexels/…  →  Vite proxy (dev) / direct URL (prod)
 *                              →  Express server  →  Pexels API
 */

// Base path — respects the same env var used by the axios instance
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ── Generic fetch helper ──────────────────────────────────────────────────────
async function apiFetch(path) {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${API_BASE}${path}`, { headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Unsplash helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch photos from the Unsplash backend proxy.
 * @param {number} page    – Page number (default 1)
 * @param {string} query   – Optional search keyword
 * @param {number} perPage – Results per page (default 20, max 30)
 * @returns {Promise<{ photos: Object[], hasMore: boolean }>}
 */
export async function fetchPhotos(page = 1, query = '', perPage = 20) {
  try {
    const qs = new URLSearchParams({ page, per_page: perPage, ...(query && { query }) });
    const data = await apiFetch(`/unsplash/photos?${qs}`);
    return { photos: data.photos || [], hasMore: data.hasMore ?? (data.photos?.length === perPage) };
  } catch (error) {
    console.error('[Unsplash] Error fetching photos:', error);
    return { photos: [], hasMore: false };   // graceful degradation — don't crash the feed
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pexels helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch photos from the Pexels backend proxy.
 * @param {string}  query    – Search term (empty for curated)
 * @param {number}  page     – Page number (default 1)
 * @param {number}  perPage  – Results per page (default 20)
 * @returns {Promise<{ photos: Object[], meta: Object }>}
 */
export async function fetchPexelsPhotos(query = '', page = 1, perPage = 20) {
  try {
    const qs = new URLSearchParams({
      page,
      per_page: perPage,
      ...(query && { query }),
    });
    const data = await apiFetch(`/pexels/photos?${qs}`);
    return { photos: data.photos || [], meta: data.meta || {} };
  } catch (error) {
    console.error('[Pexels] Error fetching photos:', error);
    throw error;
  }
}

/**
 * Fetch videos from the Pexels backend proxy.
 * @param {string}  query    – Search term (empty for popular)
 * @param {number}  page     – Page number (default 1)
 * @param {number}  perPage  – Results per page (default 15)
 * @returns {Promise<{ videos: Object[], meta: Object }>}
 */
export async function fetchPexelsVideos(query = '', page = 1, perPage = 15) {
  try {
    const qs = new URLSearchParams({
      page,
      per_page: perPage,
      ...(query && { query }),
    });
    const data = await apiFetch(`/pexels/videos?${qs}`);
    return { videos: data.videos || [], meta: data.meta || {} };
  } catch (error) {
    console.error('[Pexels] Error fetching videos:', error);
    throw error;
  }
}

