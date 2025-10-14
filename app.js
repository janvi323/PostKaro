var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const passport = require('passport');
const expressSession = require('express-session');
const flash = require("connect-flash");
const MongoStore = require("connect-mongo");
const http = require("http");
const conversationsRoutes = require("./routes/conversations");
const notificationsRouter = require('./routes/notifications');
// Routers
const feedRouter = require('./routes/feed');
var indexRouter = require('./routes/index');
var usersRouter = require('./models/users');  // ⚠️ this looks wrong, should be routes/users.js
var postRouter = require('./routes/postOperations');
const chatRoutes = require("./routes/chat");
const followRouter = require('./routes/follow');

// Socket controller
const socketController = require("./controllers/socket");

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ✅ Persistent Session middleware
app.use(expressSession({
  resave: false,
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET || "this_is_a_secret_key",
  store: MongoStore.create({
    mongoUrl: "mongodb://127.0.0.1:27017/passport_sessions",
    collectionName: "sessions"
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// ✅ Passport config
require("./controllers/passport")(passport);

// Other middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());

// Global user middleware for navbar notifications
app.use(async (req, res, next) => {
  res.locals.user = req.user;
  if (req.user) {
    try {
      const User = require('./models/users');
      const userData = await User.findById(req.user._id).select('followRequests');
      if (userData) {
        res.locals.user.followRequests = userData.followRequests || [];
      }
    } catch (error) {
      console.error('Error fetching user data for navbar:', error);
    }
  }
  next();
});

// Routes
app.use('/', feedRouter); // Feed routes first (handles /, /feed, /explore, /dashboard)
app.use('/', indexRouter); // Auth routes (/login, /register, etc.)
app.use('/users', usersRouter); // ⚠️ make sure this is a router, not model
app.use('/', postRouter);
app.use('/chat', chatRoutes); // ✅ namespace chats
app.use("/conversations", conversationsRoutes);
app.use('/follow', followRouter); // Follow system routes
app.use('/notifications', notificationsRouter); // Notifications routes
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// ✅ Socket.io will be initialized in bin/www
app.set('socketController', socketController);

module.exports = app;
