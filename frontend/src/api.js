/**
 * api.js — Unsplash proxy API helper
 *
 * Calls the backend proxy at /api/unsplash instead of hitting
 * Unsplash directly, so the API key is never exposed to the client.
 */

// Use relative /api path so requests go through Vite's dev proxy
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Fetch photos from the Unsplash backend proxy.
 *
 * @param {number} page  – Page number for pagination (default: 1)
 * @param {string} query – Optional search keyword
 * @returns {Promise<Object[]>} Array of Unsplash photo objects
 */
export async function fetchPhotos(page = 1, query = '') {
  try {
    const url = `${API_BASE}/unsplash/photos?page=${page}&query=${encodeURIComponent(query)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Unsplash proxy responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.photos; // array of Unsplash photo objects
  } catch (error) {
    console.error('Error fetching Unsplash photos:', error);
    throw error;
  }
}
