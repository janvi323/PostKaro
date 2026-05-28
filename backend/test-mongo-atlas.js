/**
 * MongoDB Atlas Connection Tester
 * Run: node test-mongo-atlas.js
 * 
 * This script tests:
 * 1. DNS resolution (can find the cluster)
 * 2. Authentication (correct credentials)
 * 3. Network connectivity (firewall/whitelist issues)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
const MONGODB_URI = process.env.MONGODB_URI;
const maskMongoURI = (uri) => uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+@/, '$1***@');

console.log('🔍 MongoDB Connection Test\n');
console.log('='.repeat(60));

if (!MONGO_URI) {
  console.log('❌ MONGO_URI not found in .env');
  process.exit(1);
}

console.log('📍 Attempting to connect to MongoDB Atlas...\n');
console.log('URI (masked):', maskMongoURI(MONGO_URI));

async function testConnection() {
  try {
    console.log('⏳ Connecting... (this may take 10-15 seconds)\n');

    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000, // 15 seconds
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    });

    console.log('✅ SUCCESS! Connected to MongoDB Atlas\n');
    console.log('📊 Connection Details:');
    console.log(`  • Host: ${conn.connection.host}`);
    console.log(`  • Database: ${conn.connection.name}`);
    console.log(`  • State: ${conn.connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);
    console.log(`  • Collections: ${Object.keys(conn.connection.collections).length}\n`);

    // Test write permission
    console.log('🧪 Testing write permission...');
    const testCol = conn.connection.collection('_connection_test');
    const testDoc = { test: true, timestamp: new Date() };
    const result = await testCol.insertOne(testDoc);
    console.log('✅ Write successful! Test document ID:', result.insertedId);

    // Clean up
    await testCol.deleteOne({ _id: result.insertedId });
    console.log('✅ Cleanup successful\n');

    console.log('🎉 All tests passed! MongoDB Atlas is ready to use.');
    process.exit(0);
  } catch (err) {
    console.log('❌ CONNECTION FAILED\n');
    console.log('Error Type:', err.name);
    console.log('Error Message:', err.message);
    console.log('Error Code:', err.code || 'N/A');

    console.log('\n' + '='.repeat(60));
    console.log('TROUBLESHOOTING:\n');

    if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.log('🔴 DNS Resolution Failed');
      console.log('Possible causes:');
      console.log('  1. No internet connection');
      console.log('  2. MongoDB Atlas cluster hostname is incorrect');
      console.log('  3. Network/DNS issues\n');
      console.log('Action items:');
      console.log('  • Check your internet connection');
      console.log('  • Verify MONGO_URI in .env file');
      console.log('  • Try pinging 8.8.8.8 to test DNS');
    }

    if (
      err.message.includes('authentication failed') ||
      err.message.includes('auth error') ||
      err.message.includes('Unauthorized')
    ) {
      console.log('🔴 Authentication Failed');
      console.log('Possible causes:');
      console.log('  1. Incorrect username or password');
      console.log('  2. Special characters not properly escaped');
      console.log('  3. User doesnt exist in MongoDB Atlas\n');
      console.log('Action items:');
      console.log('  • Verify MONGO_URI credentials in .env');
      console.log('  • Check username and password in MongoDB Atlas console');
      console.log('  • If password has special chars, ensure they\'re URL-encoded');
    }

    if (
      err.message.includes('connect ECONNREFUSED') ||
      err.message.includes('EHOSTUNREACH')
    ) {
      console.log('🔴 Connection Refused/Unreachable');
      console.log('Possible causes:');
      console.log('  1. IP address not whitelisted in MongoDB Atlas');
      console.log('  2. Firewall blocking connection');
      console.log('  3. Network policy issue\n');
      console.log('Action items:');
      console.log('  • GO TO: https://cloud.mongodb.com/');
      console.log('  • Login to your MongoDB Atlas account');
      console.log('  • Click on your cluster');
      console.log('  • Go to: Security > Network Access');
      console.log('  • Check if your IP is whitelisted');
      console.log('  • If not, add your IP or use 0.0.0.0/0 for development');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\nIf you\'re still having issues:');
    console.log('1. Check your current IP: https://www.whatismyipaddress.com/');
    console.log('2. Go to MongoDB Atlas > Network Access');
    console.log('3. Add your IP address with /32 subnet mask');
    console.log('4. Or use 0.0.0.0/0 (allows all IPs) for development\n');

    process.exit(1);
  }
}

testConnection();
