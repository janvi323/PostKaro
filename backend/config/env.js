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
];

const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim())
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
    throw new Error(`Invalid production environment: ${missing.join(', ')}`);
  }
};

const getAllowedOrigins = () => {
  const origins = parseOrigins(process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173');
  return origins.length ? origins : ['http://localhost:5173'];
};

module.exports = {
  getAllowedOrigins,
  validateEnv,
};
