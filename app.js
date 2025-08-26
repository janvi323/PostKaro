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
// Routers
const feedRouter = require('./routes/feed');
var indexRouter = require('./routes/index');
var usersRouter = require('./models/users');  // ⚠️ this looks wrong, should be routes/users.js
var postRouter = require('./routes/postOperations');
const chatRoutes = require("./routes/chat");

// Socket controller
const { Server } = require("socket.io");
const socketController = require("./controllers/socket");

const app = express();
const server = http.createServer(app);
const io = new Server(server); // ✅ Correct way

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

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter); // ⚠️ make sure this is a router, not model
app.use('/', postRouter);
app.use('/', feedRouter);
app.use('/chat', chatRoutes); // ✅ namespace chats
app.use("/conversations", conversationsRoutes);
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

// ✅ Initialize Socket.IO
socketController(io);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;
