import { useState, useRef } from 'react';
import { HiHeart, HiChat, HiBookmark, HiShare, HiDotsVertical, HiTrash, HiPlay } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { postService, feedService } from '../services';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function resolveUrl(url) {
  if (!url) return '/images/default-avatar.svg';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function PostMedia({ post, mediaUrl }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  const isVideo = post.fileType === 'video' || mediaUrl?.match(/\.(mp4|webm|mov)$/i);

  if (isVideo) {
    return (
      <div className="relative w-full">
        <video
          ref={videoRef}
          src={mediaUrl}
          className="w-full object-cover rounded-t-2xl"
          preload="metadata"
          loop
          muted={!videoPlaying}
          playsInline
          controls={videoPlaying}
          onClick={() => {
            if (videoRef.current) {
              if (videoPlaying) { videoRef.current.pause(); }
              else { videoRef.current.play(); }
              setVideoPlaying(!videoPlaying);
            }
          }}
        />
        {!videoPlaying && (
          <div className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={() => {
              videoRef.current?.play();
              setVideoPlaying(true);
            }}>
            <div className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center
                            hover:bg-black/70 transition-all duration-300 hover:scale-110">
              <HiPlay className="w-6 h-6 text-white ml-0.5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Image or GIF
  return (
    <div className="relative w-full">
      {!imgLoaded && !imgError && (
        <div className="w-full skeleton" style={{ paddingBottom: '75%' }} />
      )}
      <img
        src={mediaUrl}
        alt={post.caption || 'Post'}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
        className={`w-full object-cover group-hover:scale-105 transition-transform duration-500
                    ${imgLoaded ? 'block' : 'hidden'}`}
      />
      {imgError && (
        <div className="w-full flex items-center justify-center bg-pink-50 py-16">
          <span className="text-gray-400 text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.likes?.some((l) => l.user === user?._id || l.user?._id === user?._id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [showMenu, setShowMenu] = useState(false);
  const [saved, setSaved] = useState(false);

  const isOwner = user?._id === (post.user?._id || post.user);

  const handleLike = async () => {
    try {
      if (liked) {
        setLiked(false);
        setLikesCount((c) => c - 1);
        await postService.unlikePost(post._id);
      } else {
        setLiked(true);
        setLikesCount((c) => c + 1);
        await postService.likePost(post._id);
      }
    } catch {
      setLiked(!liked);
      setLikesCount((c) => (liked ? c + 1 : c - 1));
      toast.error('Failed to update like');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await postService.commentPost(post._id, commentText.trim());
      setComments((prev) => [...prev, res.data.comment]);
      setCommentText('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleSave = async () => {
    try {
      setSaved(!saved);
      await feedService.savePost(post._id);
      toast.success(saved ? 'Post unsaved' : 'Post saved');
    } catch {
      setSaved(!saved);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
      await postService.sharePost(post._id, 'copy_link');
      toast.success('Link copied!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await postService.deletePost(post._id);
      onDelete?.(post._id);
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const mediaUrl = resolveUrl(post.fileUrl);
  const userDp = resolveUrl(post.user?.dp);

  return (
    <div className="masonry-item">
      <div className="card overflow-hidden group">
        {/* Media */}
        <div className="relative overflow-hidden rounded-t-2xl">
          <PostMedia post={post} mediaUrl={mediaUrl} />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent
                          opacity-0 group-hover:opacity-100 transition-all duration-300
                          flex items-end justify-between p-3 pointer-events-none group-hover:pointer-events-auto">
            <button onClick={handleLike} className="flex items-center gap-1 text-white">
              <HiHeart className={`w-6 h-6 ${liked ? 'text-strongPink fill-current' : ''} drop-shadow-lg
                                   transition-transform hover:scale-125`} />
              <span className="text-sm font-semibold drop-shadow-lg">{likesCount}</span>
            </button>
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 text-white">
              <HiChat className="w-6 h-6 drop-shadow-lg" />
              <span className="text-sm font-semibold drop-shadow-lg">{comments.length}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <Link to={`/profile/${post.user?._id}`} className="flex items-center gap-2 group/user">
              <img src={userDp} alt="" className="w-7 h-7 rounded-full object-cover border border-pink-100" />
              <span className="text-xs font-semibold text-gray-700 group-hover/user:text-strongPink transition-colors">
                {post.user?.fullname || post.user?.username}
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <button onClick={handleSave} className="p-1 hover:bg-pink-50 rounded-lg transition-colors">
                <HiBookmark className={`w-4 h-4 ${saved ? 'text-strongPink' : 'text-gray-400'}`} />
              </button>
              <button onClick={handleShare} className="p-1 hover:bg-pink-50 rounded-lg transition-colors">
                <HiShare className="w-4 h-4 text-gray-400" />
              </button>
              {isOwner && (
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="p-1 hover:bg-pink-50 rounded-lg transition-colors">
                    <HiDotsVertical className="w-4 h-4 text-gray-400" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-pink-100 z-10">
                      <button onClick={handleDelete}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl">
                        <HiTrash className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {post.caption && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{post.caption}</p>
          )}

          {/* Quick actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-pink-50">
            <button onClick={handleLike} className="flex items-center gap-1 text-xs">
              <HiHeart className={`w-4 h-4 ${liked ? 'text-strongPink' : 'text-gray-400'} transition-colors`} />
              <span className="text-gray-500">{likesCount}</span>
            </button>
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 text-xs">
              <HiChat className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">{comments.length}</span>
            </button>
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="mt-3 pt-3 border-t border-pink-50">
              <div className="max-h-32 overflow-y-auto space-y-2 mb-2">
                {comments.slice(-5).map((c, i) => (
                  <div key={c._id || i} className="flex gap-2 text-xs">
                    <span className="font-semibold text-gray-700">{c.user?.username || 'user'}</span>
                    <span className="text-gray-500">{c.text}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-xl bg-pink-50 border border-pink-100
                             focus:outline-none focus:border-strongPink transition-colors"
                />
                <button type="submit"
                  className="px-3 py-2 bg-strongPink text-white text-xs rounded-xl font-semibold
                             hover:bg-pink-500 transition-colors">
                  Post
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
