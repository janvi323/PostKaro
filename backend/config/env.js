/**
 * env.js — Environment validation and CORS origin resolution.
 *
 * Key behaviours:
 * - FRONTEND_URL accepts comma-separated origins for multi-domain CORS
 *   (e.g. main Vercel domain + preview deployment domain)
 * - validateEnv() only runs in production and throws early if required
 *   variables are missing or placeholder values, preventing a broken
 *   deployment from silently serving requests with bad configuration.
 */

const REQUIRED_IN_PRODUCTION = [
  'MONGO_URI',
  'SESSION_SECRET',
  'JWT_SECRET',
  'FRONTEND_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
];

const PLACEHOLDER_PATTERNS = [
  /^CHANGE_ME/i,
  /^your_/i,
  /generate_.*random/i,
  /placeholder/i,
  /replace_with/i,
  /YOUR_RENDER/i,
  /YOUR_VERCEL/i,
];

const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, '')) // trim trailing slashes
    .filter(Boolean);

const isPlaceholder = (value) => !value || PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));

const validateEnv = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => isPlaceholder(process.env[key]));

  if ((process.env.SESSION_SECRET || '').length < 32) {
    missing.push('SESSION_SECRET must be at least 32 characters');
  }
  if ((process.env.JWT_SECRET || '').length < 32) {
    missing.push('JWT_SECRET must be at least 32 characters');
  }

  if (missing.length) {
    throw new Error(`Invalid production environment — fix these before deploying: ${missing.join(', ')}`);
  }
};

/**
 * Build the list of allowed CORS origins.
 *
 * Sources (all are included if set):
 * 1. FRONTEND_URL   — primary frontend domain(s), comma-separated
 *    e.g. "https://postkaro.vercel.app,https://postkaro-git-main-user.vercel.app"
 * 2. CLIENT_URL     — legacy alias (backward compat)
 * 3. localhost:5173 — always included (development)
 * 4. localhost:4173 — Vite preview server
 */
const getAllowedOrigins = () => {
  const rawOrigins = [
    process.env.FRONTEND_URL || '',
    process.env.CLIENT_URL || '',
  ].join(',');

  const origins = parseOrigins(rawOrigins);

  // Always allow local development origins
  const devOrigins = ['http://localhost:5173', 'http://localhost:4173'];

  const allOrigins = [...new Set([...origins, ...devOrigins])].filter(Boolean);
  return allOrigins.length ? allOrigins : ['http://localhost:5173'];
};

module.exports = {
  getAllowedOrigins,
  validateEnv,
};
