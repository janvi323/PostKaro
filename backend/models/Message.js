const mongoose = require('mongoose');

/**
 * Message Schema
 *
 * Fields added for new features:
 *  - isDeleted   : "Unsend / Delete for Everyone" — when true the content is
 *                  replaced with "This message was deleted" on all clients via
 *                  the real-time "messageDeleted" socket event.
 *  - deletedFor  : "Delete for Me" — an array of userId strings. The REST GET
 *                  /chat/:userId endpoint filters these out so the requester
 *                  never sees messages they personally deleted.
 */
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
  seen: { type: Boolean, default: false },

  // Feature: "Delete for Me" — stores user IDs who soft-deleted this message.
  // The message stays in DB but is filtered out for those users on GET /chat/:userId.
  deletedFor: [{ type: String }],

  // Feature: "Unsend / Delete for Everyone" — when true, content is hidden for
  // ALL participants and replaced with "This message was deleted" placeholder.
  isDeleted: { type: Boolean, default: false },
});

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, seen: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
