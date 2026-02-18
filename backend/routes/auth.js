const express = require('express');
const crypto = require('crypto');
const passport = require('passport');
const User = require('../models/users');
const Activity = require('../models/Activity');
const { generateToken } = require('../middleware/auth');
const { sendResetEmail } = require('../config/email');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, fullname, password } = req.body;

    if (!username || !email || !fullname || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.username === username ? 'Username already taken' : 'Email already registered',
      });
    }

    const userData = new User({ username, email, fullname });
    const user = await User.register(userData, password);

    const token = generateToken(user);

    await Activity.logLogin(user._id, req.get('User-Agent'), req.ip);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullname: user.fullname,
        dp: user.dp,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error' });
    if (!user) return res.status(401).json({ success: false, message: info?.message || 'Invalid credentials' });

    const token = generateToken(user);

    Activity.logLogin(user._id, req.get('User-Agent'), req.ip).catch(console.error);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullname: user.fullname,
        dp: user.dp,
        bio: user.bio,
        isPrivate: user.isPrivate,
      },
    });
  })(req, res, next);
});

// Google OAuth initiate
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed` }),
  (req, res) => {
    const token = generateToken(req.user);
    Activity.logLogin(req.user._id, req.get('User-Agent'), req.ip).catch(console.error);
    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
);

// Get current user
router.get('/me', require('../middleware/auth').authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-hash -salt')
      .populate('followRequests', 'username fullname dp')
      .populate('sentRequests', 'username fullname dp');

    res.json({ success: true, user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== FORGOT PASSWORD ====================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists — always return success
      return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Build reset URL pointing to the React frontend
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    await sendResetEmail(user.email, resetUrl, user.username || user.fullname);

    res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Failed to process request. Please try again.' });
  }
});

// ==================== RESET PASSWORD ====================
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset token is invalid or has expired' });
    }

    // Use passport-local-mongoose's setPassword method
    await user.setPassword(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
  }
});

module.exports = router;
