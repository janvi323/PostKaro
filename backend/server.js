require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require('passport');
const expressSession = require('express-session');
const MongoStore = require('connect-mongo');
const { Server } = require('socket.io');

// Database
const connectDB = require('./config/db');
connectDB();

// Passport config
require('./config/passport')(passport);

// ==================== CORS ORIGINS ====================
// Support comma-separated origins for multi-environment deployments.
// e.g. CLIENT_URL="https://postkaro.vercel.app,https://www.postkaro.vercel.app"
// Falls back to localhost:5173 for local development.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, SSR)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// App
const app = express();
const server = http.createServer(app);

// Socket.IO with CORS — use a function so behaviour matches the Express cors
// middleware: allow no-origin requests (Postman, SSR), block unknown origins.
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`[Socket.IO CORS] Blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Generous timeouts reduce spurious disconnects during slow handshakes in dev
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket controller
const socketController = require('./controllers/socket');
socketController(io);

// ==================== MIDDLEWARE ====================

// Security headers — must come before everything else
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images/videos to load on the frontend
    contentSecurityPolicy: process.env.NODE_ENV === 'production', // only enforce CSP in production
  })
);

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login/register attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
});

app.use(globalLimiter);

// CORS — must come before routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle pre-flight for all routes

// Body parsers
app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/audios', express.static(path.join(__dirname, 'public/audios')));

// Fallback: serve a placeholder SVG when an uploaded image or video file is missing
app.use('/images/uploads', (req, res) => {
  res.set('Content-Type', 'image/svg+xml');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#fce4ec"/>
    <text x="200" y="140" text-anchor="middle" font-family="Arial" font-size="20" fill="#e91e63">Image not found</text>
    <text x="200" y="170" text-anchor="middle" font-family="Arial" font-size="14" fill="#f48fb1">Upload a new post!</text>
  </svg>`);
});

// Fallback: serve default-avatar.svg when a profile-picture file is missing
app.use('/images/dp', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/images/dp/default-avatar.svg'));
});

// Session (needed for Passport Google OAuth flow)
app.use(
  expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'postkaro_secret',
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 60 * 60 * 24, // 1 day in seconds — matches cookie maxAge
      autoRemove: 'native', // use MongoDB TTL index to clean up expired sessions
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ==================== API ROUTES ====================

const authRoutes = require('./routes/auth');
// Apply strict rate limit to auth endpoints
app.use('/api/auth', authLimiter);
const feedRoutes = require('./routes/feed');
const postRoutes = require('./routes/posts');
const profileRoutes = require('./routes/profile');
const chatRoutes = require('./routes/chat');
const conversationRoutes = require('./routes/conversations');
const followRoutes = require('./routes/follow');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const unsplashRoutes = require('./routes/unsplash');
const pexelsRoutes = require('./routes/pexels'); // Pexels photo + video proxy

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/unsplash', unsplashRoutes);
app.use('/api/pexels', pexelsRoutes); // Pexels proxy — API key never reaches client

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'PostKaro API is running', timestamp: new Date() });
});

// ==================== ERROR HANDLING ====================

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 PostKaro API running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🌐 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`🛠️  Environment: ${process.env.NODE_ENV || 'development'}`);
});

// HTTP server error (e.g. EADDRINUSE)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Kill the other process or change PORT in .env`);
  } else {
    console.error('❌ HTTP server error:', err);
  }
  process.exit(1);
});

// Socket.IO engine-level errors (transport errors, bad requests, etc.)
io.engine.on('connection_error', (err) => {
  console.error('[Socket.IO] Engine connection error:', {
    code: err.code,
    message: err.message,
    context: err.context,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — closing server gracefully…');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

// Catch unhandled promise rejections so they don't silently swallow errors
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled promise rejection:', reason);
});

module.exports = { app, server, io };
