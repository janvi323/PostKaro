const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Stores per-photo interactions (likes, saves, comments) for Unsplash photos.
 * A document is created on first interaction and reused across users.
 */
const unsplashInteractionSchema = new Schema(
  {
    unsplashId: { type: String, required: true, unique: true },

    // Snapshot of display metadata so we never need to re-fetch from Unsplash
    photoUrl: { type: String },
    description: { type: String },
    photographerName: { type: String },
    photographerAvatar: { type: String },
    originalLikes: { type: Number, default: 0 },

    likes: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        likedAt: { type: Date, default: Date.now },
      },
    ],

    saves: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    comments: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true, maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Lean helpers
unsplashInteractionSchema.methods.isLikedBy = function (userId) {
  return this.likes.some((l) => l.user.equals(userId));
};
unsplashInteractionSchema.methods.isSavedBy = function (userId) {
  return this.saves.some((id) => id.equals(userId));
};

module.exports = mongoose.model('UnsplashInteraction', unsplashInteractionSchema);
