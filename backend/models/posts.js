const mongoose = require('mongoose');
const { Schema } = mongoose;

const postSchema = new Schema(
  {
    fileUrl: { type: String, required: true },
    fileType: { type: String, enum: ['image', 'video'], required: true },
    caption: { type: String },
    voiceUrl: { type: String },

    likes: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        likedAt: { type: Date, default: Date.now },
        ipAddress: String,
        userAgent: String,
      },
    ],

    comments: [
      {
        text: { type: String },
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },
        ipAddress: String,
        userAgent: String,
        isEdited: { type: Boolean, default: false },
        editHistory: [
          {
            text: String,
            editedAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],

    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    views: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
        ipAddress: String,
        userAgent: String,
        viewDuration: Number,
      },
    ],

    shares: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        sharedAt: { type: Date, default: Date.now },
        platform: String,
        ipAddress: String,
      },
    ],

    saves: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        savedAt: { type: Date, default: Date.now },
      },
    ],

    metadata: {
      originalFileName: String,
      fileSize: Number,
      uploadedFrom: String,
      processingTime: Number,
      hashtags: [String],
      mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },

    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
    },

    analytics: {
      totalViews: { type: Number, default: 0 },
      uniqueViews: { type: Number, default: 0 },
      averageViewTime: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
      peakViewTime: Date,
      geographicViews: [
        {
          country: String,
          count: { type: Number, default: 0 },
        },
      ],
    },
  },
  { timestamps: true }
);

postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ 'likes.user': 1 });
postSchema.index({ 'comments.user': 1 });
postSchema.index({ 'views.user': 1, 'views.viewedAt': -1 });

postSchema.virtual('likesCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

postSchema.virtual('commentsCount').get(function () {
  return this.comments ? this.comments.length : 0;
});

postSchema.virtual('viewsCount').get(function () {
  return this.views ? this.views.length : 0;
});

postSchema.virtual('sharesCount').get(function () {
  return this.shares ? this.shares.length : 0;
});

postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

postSchema.methods.addLike = function (userId, ipAddress, userAgent) {
  const existingLike = this.likes.find((like) => like.user.toString() === userId.toString());
  if (existingLike) return false;
  this.likes.push({ user: userId, likedAt: new Date(), ipAddress, userAgent });
  return true;
};

postSchema.methods.removeLike = function (userId) {
  const likeIndex = this.likes.findIndex((like) => like.user.toString() === userId.toString());
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
    return true;
  }
  return false;
};

postSchema.methods.addComment = function (userId, text, ipAddress, userAgent) {
  const comment = { text, user: userId, createdAt: new Date(), ipAddress, userAgent };
  this.comments.push(comment);
  return comment;
};

postSchema.methods.addView = function (userId, ipAddress, userAgent, viewDuration = 0) {
  const lastView = this.views.find(
    (view) =>
      view.user.toString() === userId.toString() &&
      new Date() - view.viewedAt < 30 * 60 * 1000
  );
  if (!lastView) {
    this.views.push({ user: userId, viewedAt: new Date(), ipAddress, userAgent, viewDuration });
    this.analytics.totalViews += 1;
    return true;
  }
  return false;
};

postSchema.methods.getEngagementStats = function () {
  const totalInteractions = this.likesCount + this.commentsCount + this.sharesCount;
  const engagementRate = this.viewsCount > 0 ? (totalInteractions / this.viewsCount) * 100 : 0;
  return {
    likes: this.likesCount,
    comments: this.commentsCount,
    views: this.viewsCount,
    shares: this.sharesCount,
    engagementRate: Math.round(engagementRate * 100) / 100,
    totalInteractions,
  };
};

postSchema.statics.getPopularPosts = function (limit = 10) {
  return this.aggregate([
    {
      $addFields: {
        engagementScore: {
          $add: [
            { $size: { $ifNull: ['$likes', []] } },
            { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 2] },
            { $multiply: [{ $size: { $ifNull: ['$views', []] } }, 0.1] },
          ],
        },
      },
    },
    { $sort: { engagementScore: -1 } },
    { $limit: limit },
  ]);
};

postSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await mongoose.model('User').updateOne({ _id: doc.user }, { $pull: { posts: doc._id } });
  }
});

module.exports = mongoose.model('Post', postSchema);
