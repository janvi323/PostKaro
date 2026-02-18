const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      required: true,
      enum: [
        'like_post', 'unlike_post', 'comment_post', 'delete_comment',
        'create_post', 'delete_post', 'follow_user', 'unfollow_user',
        'accept_follow_request', 'decline_follow_request',
        'send_follow_request', 'cancel_follow_request',
        'send_message', 'delete_message', 'update_profile',
        'change_privacy', 'upload_media', 'view_profile',
        'search_user', 'login', 'logout', 'register', 'view_post', 'share_post',
      ],
    },
    target: { type: mongoose.Schema.Types.ObjectId, refPath: 'targetModel' },
    targetModel: { type: String, enum: ['User', 'Post', 'Message'] },
    details: {
      commentText: String,
      commentId: mongoose.Schema.Types.ObjectId,
      postCaption: String,
      postType: String,
      messageText: String,
      conversationId: mongoose.Schema.Types.ObjectId,
      changedFields: [String],
      oldValues: mongoose.Schema.Types.Mixed,
      newValues: mongoose.Schema.Types.Mixed,
      searchQuery: String,
      searchResults: Number,
      userAgent: String,
      ipAddress: String,
      platform: String,
      targetUsername: String,
      isPrivateAccount: Boolean,
      oldPrivacy: String,
      newPrivacy: String,
      fileSize: Number,
      hasVoice: Boolean,
      viewDuration: Number,
      location: {
        country: String,
        city: String,
        coordinates: { lat: Number, lng: Number },
      },
    },
    timestamp: { type: Date, default: Date.now },
    sessionId: String,
    context: {
      referrer: String,
      userAgent: String,
      deviceType: String,
      browserName: String,
    },
  },
  { timestamps: true }
);

activitySchema.index({ actor: 1, timestamp: -1 });
activitySchema.index({ target: 1, timestamp: -1 });
activitySchema.index({ action: 1, timestamp: -1 });
activitySchema.index({ timestamp: -1 });

activitySchema.virtual('actionDescription').get(function () {
  const descriptions = {
    like_post: 'liked a post',
    unlike_post: 'unliked a post',
    comment_post: 'commented on a post',
    delete_comment: 'deleted a comment',
    create_post: 'created a post',
    delete_post: 'deleted a post',
    follow_user: 'followed a user',
    unfollow_user: 'unfollowed a user',
    accept_follow_request: 'accepted a follow request',
    decline_follow_request: 'declined a follow request',
    send_follow_request: 'sent a follow request',
    cancel_follow_request: 'cancelled a follow request',
    send_message: 'sent a message',
    delete_message: 'deleted a message',
    update_profile: 'updated profile',
    change_privacy: 'changed privacy settings',
    upload_media: 'uploaded media',
    view_profile: 'viewed a profile',
    search_user: 'searched for users',
    login: 'logged in',
    logout: 'logged out',
    register: 'registered',
  };
  return descriptions[this.action] || this.action;
});

activitySchema.set('toJSON', { virtuals: true });

activitySchema.statics.getDeviceType = function (userAgent) {
  if (!userAgent) return 'unknown';
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet/i.test(userAgent)) return 'tablet';
  return 'desktop';
};

activitySchema.statics.logLike = function (userId, postId, userAgent, ipAddress) {
  return this.create({
    actor: userId,
    action: 'like_post',
    target: postId,
    targetModel: 'Post',
    context: { userAgent, deviceType: this.getDeviceType(userAgent) },
    details: { ipAddress },
  });
};

activitySchema.statics.logComment = function (userId, postId, commentText, commentId, userAgent, ipAddress) {
  return this.create({
    actor: userId,
    action: 'comment_post',
    target: postId,
    targetModel: 'Post',
    details: { commentText, commentId, ipAddress },
    context: { userAgent, deviceType: this.getDeviceType(userAgent) },
  });
};

activitySchema.statics.logFollow = function (followerId, followedId, userAgent, ipAddress) {
  return this.create({
    actor: followerId,
    action: 'follow_user',
    target: followedId,
    targetModel: 'User',
    details: { ipAddress },
    context: { userAgent, deviceType: this.getDeviceType(userAgent) },
  });
};

activitySchema.statics.logLogin = function (userId, userAgent, ipAddress) {
  return this.create({
    actor: userId,
    action: 'login',
    details: { ipAddress },
    context: { userAgent, deviceType: this.getDeviceType(userAgent) },
  });
};

module.exports = mongoose.model('Activity', activitySchema);
