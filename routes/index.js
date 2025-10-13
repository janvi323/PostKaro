const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('../models/users.js');

const router = express.Router();

// Passport Config
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Root route - redirect to feed if logged in, otherwise login
router.get('/home', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/feed');
  } else {
    res.redirect('/login');
  }
});

// Login page
router.get('/login', (req, res) => {
  res.render('index', { show: 'login', error: req.flash("error") });
});

// Register page
router.get('/register', (req, res) => {
  res.render('index', { show: 'register', error: req.flash('error') });
});

// Login POST
router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/feed',
    failureRedirect: '/login',
    failureFlash: true
  })
);

// Register POST
router.post('/register', (req, res) => {
  const { username, email, fullname, password } = req.body;
  const userData = new User({ username, email, fullname });

  User.register(userData, password)
    .then(() => {
      passport.authenticate('local')(req, res, () => {
        res.redirect('/profile');
      });
    })
    .catch(err => {
      req.flash('error', err.message);
      res.redirect('/register');
    });
});

// Logout
router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

module.exports = router;
