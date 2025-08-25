// models/Post.js
// models/Post.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const postSchema = new Schema({
  fileUrl: { type: String, required: true },  // main image/video
  fileType: { type: String, enum: ['image', 'video'], required: true }, // only image or video now
  caption: { type: String}, // compulsory caption
  voiceUrl: { type: String }, // optional voice note file
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ 
    text: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);


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
