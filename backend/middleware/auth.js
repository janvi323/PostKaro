const jwt = require('jsonwebtoken');
const User = require('../models/users');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return process.env.JWT_SECRET;
};

const jwtOptions = () => ({
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'postkaro-api',
  audience: process.env.JWT_AUDIENCE || 'postkaro-web',
});

const jwtVerifyOptions = () => ({
  issuer: process.env.JWT_ISSUER || 'postkaro-api',
  audience: process.env.JWT_AUDIENCE || 'postkaro-web',
});

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role || 'user' },
    getJwtSecret(),
    jwtOptions()
  );
};

// Middleware: Verify JWT from Authorization header
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret(), jwtVerifyOptions());

    const user = await User.findById(decoded.id).select('-hash -salt');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// Optional auth — sets req.user if token present but doesn't block
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, getJwtSecret(), jwtVerifyOptions());
      req.user = await User.findById(decoded.id).select('-hash -salt');
    }
  } catch {
    // Silently continue without auth
  }
  next();
};

module.exports = { generateToken, authenticateJWT, optionalAuth };
