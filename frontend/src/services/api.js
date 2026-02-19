/**
 * services/api.js
 *
 * Axios instance used by all service modules.
 *
 * Base URL resolution (in priority order):
 *  1. VITE_API_URL env variable  — set this in your .env for production builds
 *     e.g.  VITE_API_URL=https://postkaro-backend.onrender.com/api
 *  2. Vite dev proxy fallback ( /api )  — proxied to http://localhost:5000 by
 *     vite.config.js in development. DO NOT change this fallback to a
 *     hardcoded localhost URL or the production build will break.
 *
 * Why this pattern?
 *  - In development:  requests go to /api  →  Vite proxy  →  localhost:5000
 *  - In production:   VITE_API_URL is set to the Render backend URL
 *  - API key is NEVER in frontend code
 */
import axios from 'axios';

// ── Base URL ──────────────────────────────────────────────────────────────────
// Use the env var if provided (production), else fall back to /api (dev proxy).
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials lets the browser send session cookies (used by Passport/Google OAuth)
  withCredentials: true,
});

// ── Request interceptor: attach JWT token ─────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: transparent 401 handling ───────────────────────────
// Redirect to /login on 401 so the user is prompted to re-authenticate.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on the login page to avoid redirect loops
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
