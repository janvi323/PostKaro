/**
 * services/api.js — Axios instance used by all service modules.
 *
 * Base URL resolution (priority order):
 *
 *  1. VITE_API_URL env var (set in Vercel dashboard for production):
 *       https://postkaro-main.onrender.com/api
 *
 *  2. Relative /api fallback (development via Vite proxy):
 *       vite.config.js proxies /api → http://localhost:5000
 *
 * IMPORTANT — why we do NOT hardcode localhost here:
 *   VITE_ variables are injected at BUILD TIME. If localhost:5000 is
 *   in the .env file that Vercel reads during build, every API call
 *   in the deployed app will hit localhost (which doesn't exist in
 *   Vercel's build environment), causing all requests to fail silently.
 *
 * Correct setup:
 *   - Local .env:       VITE_API_URL=   (empty — Vite proxy takes over)
 *   - Vercel dashboard: VITE_API_URL=https://postkaro-main.onrender.com/api
 */
import axios from 'axios';

// If VITE_API_URL is empty string (dev), fall back to /api (proxied by Vite).
// If VITE_API_URL is set (prod), use the full Render URL.
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials allows the browser to send session cookies.
  // Required for Passport Google OAuth session continuity.
  withCredentials: true,
  // 30-second timeout — prevents hanging requests on Render cold starts
  timeout: 30000,
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on an auth page (prevents redirect loops)
      const authPages = ['/login', '/register', '/forgot-password', '/auth/callback'];
      const isAuthPage = authPages.some((p) => window.location.pathname.startsWith(p));
      if (!isAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
