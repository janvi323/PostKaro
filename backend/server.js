require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
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

// App
const app = express();
const server = http.createServer(app);

// Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket controller
const socketController = require('./controllers/socket');
socketController(io);

// ==================== MIDDLEWARE ====================

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

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

// Session (needed for Passport Google OAuth flow)
app.use(
  expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'postkaro_secret',
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pinterest',
      collectionName: 'sessions',
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ==================== API ROUTES ====================

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
  console.log(`🌐 CORS enabled for ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});

module.exports = { app, server, io };
