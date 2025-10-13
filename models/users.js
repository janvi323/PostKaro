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
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
}, { timestamps: true });

userSchema.plugin(plm);

module.exports = mongoose.model('User', userSchema);
