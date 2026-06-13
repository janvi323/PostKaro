require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require('passport');
const expressSession = require('express-session');
const MongoStore = require('connect-mongo');
const { Server } = require('socket.io');
const { getAllowedOrigins, validateEnv } = require('./config/env');

validateEnv();

const connectDB = require('./config/db');
connectDB();

require('./config/passport')(passport);

const allowedOrigins = getAllowedOrigins();
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`[Socket.IO CORS] Blocked origin: ${origin}`);
      return callback(new Error(`Origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const socketController = require('./controllers/socket');
socketController(io);

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              mediaSrc: ["'self'", 'https:'],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              connectSrc: ["'self'", ...allowedOrigins],
            },
          }
        : false,
  })
);
app.use(compression());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
});

app.use(globalLimiter);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

// Serve default-avatar.svg at the legacy path used by the User model default
app.get('/images/default-avatar.svg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/images/dp/default-avatar.svg'));
});

app.use('/images', express.static(path.join(__dirname, 'public/images'), { maxAge: '7d' }));
app.use('/audios', express.static(path.join(__dirname, 'public/audios'), { maxAge: '7d' }));

app.use('/images/uploads', (req, res) => {
  res.set('Content-Type', 'image/svg+xml');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#fce4ec"/>
    <text x="200" y="140" text-anchor="middle" font-family="Arial" font-size="20" fill="#e91e63">Image not found</text>
    <text x="200" y="170" text-anchor="middle" font-family="Arial" font-size="14" fill="#f48fb1">Upload a new post!</text>
  </svg>`);
});

app.use('/images/dp', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/images/dp/default-avatar.svg'));
});

app.use(
  expressSession({
    name: 'postkaro.sid',
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 60 * 60 * 24,
      autoRemove: 'native',
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require('./routes/auth');
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
const pexelsRoutes = require('./routes/pexels');

app.use('/api/auth', authLimiter, authRoutes);
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
app.use('/api/pexels', pexelsRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'PostKaro API is running',
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.originalUrl,
    method: req.method,
  });
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`PostKaro API running on http://localhost:${PORT}`);
  console.log('Socket.IO ready');
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the other process or change PORT in .env`);
  } else {
    console.error('HTTP server error:', err);
  }
  process.exit(1);
});

io.engine.on('connection_error', (err) => {
  console.error('[Socket.IO] Engine connection error:', {
    code: err.code,
    message: err.message,
    context: err.context,
  });
});

const shutdown = () => {
  console.log('Shutdown signal received - closing server gracefully');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

module.exports = { app, server, io };
