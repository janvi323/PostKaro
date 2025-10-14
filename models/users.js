// models/User.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const plm = require("passport-local-mongoose");

mongoose.connect('mongodb://127.0.0.1:27017/pinterest');



const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String }, // handled by passport-local-mongoose
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  dp: { type: String, default: "/images/default-avatar.svg" },
  savedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],  // profile picture
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  
  // Follow system
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],  // Users this user follows
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],  // Users who follow this user
  
  // Follow requests system
  followRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],  // Pending follow requests sent to this user
  sentRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],    // Follow requests this user has sent
  
  // Account settings
  isPrivate: { type: Boolean, default: false },  // Private account requires follow approval
  bio: { type: String, maxlength: 160, default: '' },  // User bio
  website: { type: String, default: '' }  // User website
}, { timestamps: true });

userSchema.plugin(plm);

module.exports = mongoose.model('User', userSchema);
