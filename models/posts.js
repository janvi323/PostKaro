// models/Post.js
// models/Post.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const postSchema = new Schema({
  fileUrl: { type: String, required: true },  // main image/video
  fileType: { type: String, enum: ['image', 'video'], required: true }, // only image or video now
  caption: { type: String}, // compulsory caption
  voiceUrl: { type: String }, // optional voice note file
  
  // Enhanced likes tracking with detailed information
  likes: [{ 
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    likedAt: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String
  }],
  
  // Enhanced comments tracking with detailed information
  comments: [{ 
    text: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    ipAddress: String,
    userAgent: String,
    isEdited: { type: Boolean, default: false },
    editHistory: [{
      text: String,
      editedAt: { type: Date, default: Date.now }
    }]
  }],
  
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Additional tracking fields
  views: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    viewDuration: Number // in seconds
  }],
  
  // Share tracking
  shares: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    sharedAt: { type: Date, default: Date.now },
    platform: String, // 'copy_link', 'facebook', 'twitter', etc.
    ipAddress: String
  }],
  
  // Save tracking (for saved posts feature)
  saves: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    savedAt: { type: Date, default: Date.now }
  }],
  
  // Post metadata
  metadata: {
    originalFileName: String,
    fileSize: Number,
    uploadedFrom: String, // 'web', 'mobile', etc.
    processingTime: Number, // time taken to process upload
    hashtags: [String],
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  
  // Privacy and visibility
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  
  // Engagement analytics
  analytics: {
    totalViews: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    averageViewTime: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    peakViewTime: Date,
    geographicViews: [{
      country: String,
      count: { type: Number, default: 0 }
    }]
  }
}, { timestamps: true });

// Add indexes for better performance
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ 'likes.user': 1 });
postSchema.index({ 'comments.user': 1 });
postSchema.index({ 'views.user': 1, 'views.viewedAt': -1 });

// Virtual methods for quick stats
postSchema.virtual('likesCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

postSchema.virtual('commentsCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

postSchema.virtual('viewsCount').get(function() {
  return this.views ? this.views.length : 0;
});

postSchema.virtual('sharesCount').get(function() {
  return this.shares ? this.shares.length : 0;
});

// Instance methods
postSchema.methods.addLike = function(userId, ipAddress, userAgent) {
  // Check if user already liked
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  if (existingLike) {
    return false; // Already liked
  }
  
  this.likes.push({
    user: userId,
    likedAt: new Date(),
    ipAddress,
    userAgent
  });
  
  return true;
};

postSchema.methods.removeLike = function(userId) {
  const likeIndex = this.likes.findIndex(like => like.user.toString() === userId.toString());
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
    return true;
  }
  return false;
};

postSchema.methods.addComment = function(userId, text, ipAddress, userAgent) {
  const comment = {
    text,
    user: userId,
    createdAt: new Date(),
    ipAddress,
    userAgent
  };
  
  this.comments.push(comment);
  return comment;
};

postSchema.methods.addView = function(userId, ipAddress, userAgent, viewDuration = 0) {
  // Only add view if it's a different user or if last view was more than 30 minutes ago
  const lastView = this.views.find(view => 
    view.user.toString() === userId.toString() && 
    (new Date() - view.viewedAt) < 30 * 60 * 1000 // 30 minutes
  );
  
  if (!lastView) {
    this.views.push({
      user: userId,
      viewedAt: new Date(),
      ipAddress,
      userAgent,
      viewDuration
    });
    
    this.analytics.totalViews += 1;
    return true;
  }
  
  return false;
};

postSchema.methods.getEngagementStats = function() {
  const totalInteractions = this.likesCount + this.commentsCount + this.sharesCount;
  const engagementRate = this.viewsCount > 0 ? (totalInteractions / this.viewsCount) * 100 : 0;
  
  return {
    likes: this.likesCount,
    comments: this.commentsCount,
    views: this.viewsCount,
    shares: this.sharesCount,
    engagementRate: Math.round(engagementRate * 100) / 100,
    totalInteractions
  };
};

// Static methods
postSchema.statics.getPopularPosts = function(limit = 10) {
  return this.aggregate([
    {
      $addFields: {
        engagementScore: {
          $add: [
            { $size: { $ifNull: ["$likes", []] } },
            { $multiply: [{ $size: { $ifNull: ["$comments", []] } }, 2] },
            { $multiply: [{ $size: { $ifNull: ["$views", []] } }, 0.1] }
          ]
        }
      }
    },
    { $sort: { engagementScore: -1 } },
    { $limit: limit }
  ]);
};

postSchema.statics.getUserActivitySummary = function(userId) {
  return this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        totalPosts: { $sum: 1 },
        totalLikes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
        totalComments: { $sum: { $size: { $ifNull: ["$comments", []] } } },
        totalViews: { $sum: { $size: { $ifNull: ["$views", []] } } },
        averageLikesPerPost: { $avg: { $size: { $ifNull: ["$likes", []] } } },
        mostRecentPost: { $max: "$createdAt" }
      }
    }
  ]);
};

// ✅ Middleware to auto-remove post reference from user
postSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await mongoose.model("User").updateOne(
      { _id: doc.user },
      { $pull: { posts: doc._id } }
    );
  }
});

module.exports = mongoose.model('Post', postSchema);
