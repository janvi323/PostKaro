const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // Who performed the action
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // What action was performed
  action: {
    type: String,
    required: true,
    enum: [
      'like_post',
      'unlike_post', 
      'comment_post',
      'delete_comment',
      'create_post',
      'delete_post',
      'follow_user',
      'unfollow_user',
      'accept_follow_request',
      'decline_follow_request',
      'send_follow_request',
      'cancel_follow_request',
      'send_message',
      'delete_message',
      'update_profile',
      'change_privacy',
      'upload_media',
      'view_profile',
      'search_user',
      'login',
      'logout',
      'register'
    ]
  },
  
  // Who/what was the target of the action
  target: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel'
  },
  
  // What model the target refers to
  targetModel: {
    type: String,
    enum: ['User', 'Post', 'Message']
  },
  
  // Additional details about the action
  details: {
    // For comments
    commentText: String,
    commentId: mongoose.Schema.Types.ObjectId,
    
    // For posts
    postCaption: String,
    postType: String, // 'image', 'video', 'audio'
    
    // For messages
    messageText: String,
    conversationId: mongoose.Schema.Types.ObjectId,
    
    // For profile updates
    changedFields: [String],
    oldValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed,
    
    // For searches
    searchQuery: String,
    searchResults: Number,
    
    // General metadata
    userAgent: String,
    ipAddress: String,
    platform: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  },
  
  // When the action occurred
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  // Session information
  sessionId: String,
  
  // Additional context
  context: {
    referrer: String,
    userAgent: String,
    deviceType: String, // 'mobile', 'desktop', 'tablet'
    browserName: String
  }
}, {
  timestamps: true,
  indexes: [
    { actor: 1, timestamp: -1 },
    { target: 1, timestamp: -1 },
    { action: 1, timestamp: -1 },
    { timestamp: -1 }
  ]
});

// Add methods to the schema
activitySchema.methods.getActivitySummary = function() {
  return {
    id: this._id,
    actor: this.actor,
    action: this.action,
    target: this.target,
    timestamp: this.timestamp,
    details: this.details
  };
};

// Static methods for creating specific activities
activitySchema.statics.logLike = function(userId, postId, userAgent, ipAddress) {
  return this.create({
    actor: userId,
    action: 'like_post',
    target: postId,
    targetModel: 'Post',
    context: {
      userAgent,
      deviceType: this.getDeviceType(userAgent)
    },
    details: {
      ipAddress
    }
  });
};

activitySchema.statics.logComment = function(userId, postId, commentText, commentId, userAgent, ipAddress) {
  return this.create({
    actor: userId,
    action: 'comment_post',
    target: postId,
    targetModel: 'Post',
    details: {
      commentText,
      commentId,
      ipAddress
    },
    context: {
      userAgent,
      deviceType: this.getDeviceType(userAgent)
    }
  });
};

activitySchema.statics.logFollow = function(followerId, followedId, userAgent, ipAddress) {
  return this.create({
    actor: followerId,
    action: 'follow_user',
    target: followedId,
    targetModel: 'User',
    details: {
      ipAddress
    },
    context: {
      userAgent,
      deviceType: this.getDeviceType(userAgent)
    }
  });
};

activitySchema.statics.logMessage = function(senderId, receiverId, messageText, conversationId, userAgent, ipAddress) {
  return this.create({
    actor: senderId,
    action: 'send_message',
    target: receiverId,
    targetModel: 'User',
    details: {
      messageText: messageText.substring(0, 100), // Store first 100 chars for privacy
      conversationId,
      ipAddress
    },
    context: {
      userAgent,
      deviceType: this.getDeviceType(userAgent)
    }
  });
};

activitySchema.statics.logProfileUpdate = function(userId, changedFields, oldValues, newValues, userAgent, ipAddress) {
  return this.create({
    actor: userId,
    action: 'update_profile',
    target: userId,
    targetModel: 'User',
    details: {
      changedFields,
      oldValues,
      newValues,
      ipAddress
    },
    context: {
      userAgent,
      deviceType: this.getDeviceType(userAgent)
    }
  });
};

activitySchema.statics.logLogin = function(userId, userAgent, ipAddress) {
  return this.create({
    actor: userId,
    action: 'login',
    details: {
      ipAddress
    },
    context: {
      userAgent,
      deviceType: this.getDeviceType(userAgent)
    }
  });
};

// Helper method to determine device type
activitySchema.statics.getDeviceType = function(userAgent) {
  if (!userAgent) return 'unknown';
  
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet/i.test(userAgent)) return 'tablet';
  return 'desktop';
};

// Virtual to get human-readable action
activitySchema.virtual('actionDescription').get(function() {
  const descriptions = {
    'like_post': 'liked a post',
    'unlike_post': 'unliked a post',
    'comment_post': 'commented on a post',
    'delete_comment': 'deleted a comment',
    'create_post': 'created a post',
    'delete_post': 'deleted a post',
    'follow_user': 'followed a user',
    'unfollow_user': 'unfollowed a user',
    'accept_follow_request': 'accepted a follow request',
    'decline_follow_request': 'declined a follow request',
    'send_follow_request': 'sent a follow request',
    'cancel_follow_request': 'cancelled a follow request',
    'send_message': 'sent a message',
    'delete_message': 'deleted a message',
    'update_profile': 'updated profile',
    'change_privacy': 'changed privacy settings',
    'upload_media': 'uploaded media',
    'view_profile': 'viewed a profile',
    'search_user': 'searched for users',
    'login': 'logged in',
    'logout': 'logged out',
    'register': 'registered'
  };
  
  return descriptions[this.action] || this.action;
});

module.exports = mongoose.model('Activity', activitySchema);