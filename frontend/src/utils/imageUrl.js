/**
 * imageUrl.js — Utility for resolving backend image paths to full URLs.
 *
 * Problem:
 *   The backend stores image paths as relative strings like:
 *     /images/dp/filename.jpg
 *     /images/uploads/filename.jpg
 *
 *   In development these are proxied by Vite (/images → localhost:5000) ✅
 *   In production the frontend is on Vercel and the backend is on Render.
 *   Without prefixing, /images/dp/... resolves to postkaro.vercel.app/images/...
 *   which returns 404 because Vercel doesn't serve backend static files ❌
 *
 * Solution:
 *   In production, VITE_SOCKET_URL = https://postkaro-main.onrender.com
 *   Prepend it to every relative path so the browser fetches from Render.
 *
 * Usage:
 *   import { getImageUrl } from '../utils/imageUrl';
 *   <img src={getImageUrl(user.dp)} alt={user.fullname} />
 */

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || '';

/**
 * Resolve a backend image path to an absolute URL.
 *
 * @param {string|null|undefined} path - The image path from the DB
 * @returns {string} A fully-qualified URL safe to use in <img src>
 */
export function getImageUrl(path) {
  // Default avatar fallback
  if (!path) return `${BACKEND_URL}/images/default-avatar.svg`;

  // Already absolute (e.g. Google OAuth profile photo) — return unchanged
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  // Relative path — prefix with backend base URL
  return `${BACKEND_URL}${path}`;
}

/**
 * Resolve a post image/video URL (same logic as getImageUrl).
 * Alias kept separate for semantic clarity in components.
 */
export const getPostMediaUrl = getImageUrl;
