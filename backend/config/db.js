const mongoose = require('mongoose');

const maskMongoURI = (uri) => uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+@/, '$1***@');

// Resolve URI: prefer MONGO_URI (Atlas) over legacy MONGODB_URI (local fallback)
const getMongoURI = () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ No MongoDB URI found. Set MONGO_URI in your .env file.');
    process.exit(1);
  }
  return uri;
};

const connectDB = async () => {
  const uri = getMongoURI();

  // Mask credentials in log output for security
  const safeUri = maskMongoURI(uri);

  try {
    const conn = await mongoose.connect(uri, {
      // serverSelectionTimeoutMS: how long the driver tries to connect before giving up
      serverSelectionTimeoutMS: 10000,
      // socketTimeoutMS: how long an idle socket waits before being closed
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔗 URI: ${safeUri}`);
    }
  } catch (err) {
    console.error(`❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  // ── Connection event listeners ──────────────────────────────────────────────
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected — driver will attempt reconnect automatically');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
  });
};

module.exports = connectDB;
