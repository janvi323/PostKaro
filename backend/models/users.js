const mongoose = require('mongoose');
const { Schema } = mongoose;
const plm = require('passport-local-mongoose');

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String },
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    dp: { type: String, default: '/images/default-avatar.svg' },
    googleId: { type: String },
    savedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],

    // Follow system
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // Follow requests system
    followRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    sentRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // Account settings
    isPrivate: { type: Boolean, default: false },
    bio: { type: String, maxlength: 160, default: '' },
    website: { type: String, default: '' },

    // Password reset
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

userSchema.plugin(plm);

module.exports = mongoose.model('User', userSchema);
