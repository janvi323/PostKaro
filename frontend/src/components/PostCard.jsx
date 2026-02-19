import { useState, useRef } from 'react';
import { HiHeart, HiChat, HiBookmark, HiShare, HiDotsVertical, HiTrash, HiPlay, HiX } from 'react-icons/hi';
import { Link, useNavigate } from 'react-router-dom';
import { postService, feedService } from '../services';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Backend base URL used to convert relative /images/ paths → absolute URLs.
//
// In development: Vite proxies /images/ and /api/ to localhost:5000, so we
//   use an empty string (same-origin). Prepending localhost:5000 would still
//   work, but the proxy is more robust for local HTTPS/tunnels.
//
// In production: we need the full backend origin. Resolution order:
//   1. VITE_BACKEND_URL  — explicit backend root (e.g. https://app.onrender.com)
//   2. VITE_SOCKET_URL   — backwards-compat alias used in older deploys
//   3. VITE_API_URL      — strip the /api suffix to get the root origin
//   4. ''                — last resort; relative URL (likely broken in prod)
const API_BASE = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_BACKEND_URL
      || import.meta.env.VITE_SOCKET_URL
      || (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')
      || '');

function resolveUrl(url) {
  if (!url) return '/images/dp/default-avatar.svg';
  if (url.startsWith('http')) return url;           // already absolute (Pexels, Unsplash, …)
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function PostMedia({ post, mediaUrl, onBrokenImage }) {
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
  // NOTE: Never use 'hidden' (display:none) on lazy-loaded images — the browser's
  // intersection observer won't see them and onLoad never fires. Use opacity instead.

  // When the image URL is broken (404, network error, etc.) show a styled
  // placeholder so the card remains visible with its caption/actions.
  // The parent Feed.jsx still calls onBrokenImage() which removes
  // the card from the combined list; Dashboard.jsx does NOT pass onBrokenImage
  // so broken posts stay visible with this placeholder there.
  if (imgError) {
    return (
      <div
        className="relative w-full rounded-t-2xl bg-gradient-to-br from-pink-50 to-gray-100
                   flex flex-col items-center justify-center"
        style={{ minHeight: '180px' }}
      >
        <span className="text-4xl mb-2 opacity-30">🖼️</span>
        <p className="text-xs text-gray-400 font-medium">Media unavailable</p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: imgLoaded ? 'auto' : '160px' }}>
      {/* Skeleton overlay — sits on top while image is loading */}
      {!imgLoaded && !imgError && (
        <div className="absolute inset-0 skeleton" />
      )}
      <img
        src={mediaUrl}
        alt={post.caption || 'Post'}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        onError={() => {
          setImgError(true);
          // Notify parent so Feed.jsx can remove the card from the combined list.
          // Dashboard.jsx intentionally omits this prop so posts stay visible.
          onBrokenImage?.();
        }}
        className={`w-full object-cover group-hover:scale-105 transition-all duration-500
                    ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

export default function PostCard({ post, onDelete, onBrokenImage }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.likes?.some((l) => l.user === user?._id || l.user?._id === user?._id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [showMenu, setShowMenu] = useState(false);
  const [saved, setSaved] = useState(post.saved || false);
  const [deletingComment, setDeletingComment] = useState(null);

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
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    setDeletingComment(commentId);
    try {
      await postService.deleteComment(post._id, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch {
      toast.error('Failed to delete comment');
    } finally {
      setDeletingComment(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaved(!saved);
      await feedService.savePost(post._id);
      toast.success(saved ? 'Post unsaved' : 'Post saved!');
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
      <div className="card overflow-hidden group cursor-pointer">
        {/* Media — click opens detail page */}
        <div
          className="relative overflow-hidden rounded-t-2xl cursor-pointer"
          onClick={() => navigate(`/post/${post._id}`)}
        >
          <PostMedia post={post} mediaUrl={mediaUrl} onBrokenImage={onBrokenImage} />

          {/* Save button — top right circle */}
          <button
            onClick={(e) => { e.stopPropagation(); handleSave(); }}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full shadow-md flex items-center justify-center
                        transition-all duration-300 opacity-0 group-hover:opacity-100 active:scale-95
                        ${saved
                          ? 'bg-primaryPink text-white'
                          : 'bg-white/80 backdrop-blur-sm text-gray-500 hover:bg-primaryPink hover:text-white'}`}
          >
            <HiBookmark className="w-4 h-4" />
          </button>

          {/* Hover overlay with like + comment */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent
                          opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out
                          flex items-end justify-between p-3 pointer-events-none group-hover:pointer-events-auto">
            <button onClick={(e) => { e.stopPropagation(); handleLike(); }}
              className="flex items-center gap-1.5 text-white drop-shadow transition-transform hover:scale-110 active:scale-95">
              <HiHeart className={`w-6 h-6 drop-shadow-lg transition-colors ${liked ? 'text-secondaryPink fill-current' : ''}`} />
              <span className="text-sm font-bold drop-shadow-lg">{likesCount}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
              className="flex items-center gap-1.5 text-white drop-shadow transition-transform hover:scale-110">
              <HiChat className="w-6 h-6 drop-shadow-lg" />
              <span className="text-sm font-bold drop-shadow-lg">{comments.length}</span>
            </button>
          </div>
        </div>

        {/* Card body */}
        <div className="p-3">
          {/* User info + actions */}
          <div className="flex items-center justify-between mb-2">
            <Link to={`/profile/${post.user?._id}`} className="flex items-center gap-2 group/user min-w-0">
              <img src={userDp} alt=""
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/dp/default-avatar.svg'; }}
                className="w-7 h-7 rounded-full object-cover border-2 border-softIvory flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-600 group-hover/user:text-primaryPink transition-colors truncate">
                {post.user?.fullname || post.user?.username}
              </span>
            </Link>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={handleShare}
                className="p-1 hover:bg-mainBg rounded-lg transition-all duration-200 text-gray-400 hover:text-gray-600">
                <HiShare className="w-3.5 h-3.5" />
              </button>
              {isOwner && (
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)}
                    className="p-1 hover:bg-mainBg rounded-lg transition-all duration-200">
                    <HiDotsVertical className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-28 bg-white/95 backdrop-blur-md rounded-xl shadow-card-hover border border-softIvory/40 z-10 animate-scale-in">
                      <button onClick={handleDelete}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <HiTrash className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          {post.caption && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">{post.caption}</p>
          )}

          {/* Quick action bar */}
          <div className="flex items-center gap-3 pt-2 border-t border-softIvory/40">
            <button onClick={handleLike} className="flex items-center gap-1 group/like">
              <HiHeart className={`w-4 h-4 transition-all duration-200 group-hover/like:scale-125
                ${liked ? 'text-primaryPink fill-current' : 'text-gray-400 group-hover/like:text-primaryPink'}`} />
              <span className="text-xs text-gray-400 font-medium">{likesCount}</span>
            </button>
            <button onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1 group/chat">
              <HiChat className={`w-4 h-4 transition-all duration-200 group-hover/chat:scale-110
                ${showComments ? 'text-primaryPink' : 'text-gray-400 group-hover/chat:text-primaryPink'}`} />
              <span className="text-xs text-gray-400 font-medium">{comments.length}</span>
            </button>
          </div>

          {/* ── COMMENTS SECTION ── */}
          {showComments && (
            <div className="mt-3 animate-fade-in">
              {/* Existing comments */}
              {comments.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-2 mb-3 pr-1">
                  {comments.map((c, i) => {
                    const canDelete = isOwner || user?._id === (c.user?._id || c.user);
                    return (
                      <div key={c._id || i}
                        className="flex gap-2 p-2 rounded-xl bg-mainBg/60 group/comment relative">
                        <img
                          src={resolveUrl(c.user?.dp)}
                          alt=""
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/dp/default-avatar.svg'; }}
                          className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5 border border-softIvory"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-semibold text-gray-700">
                            {c.user?.username || 'user'}
                          </span>
                          <span className="text-[11px] text-gray-500 ml-1.5 break-words">{c.text}</span>
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteComment(c._id)}
                            disabled={deletingComment === c._id}
                            className="opacity-0 group-hover/comment:opacity-100 p-0.5 text-gray-300 hover:text-red-400
                                       transition-all duration-200 flex-shrink-0"
                          >
                            <HiX className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {comments.length === 0 && (
                <p className="text-[11px] text-gray-400 text-center py-2 mb-2">Be the first to comment!</p>
              )}

              {/* Add comment form */}
              <form onSubmit={handleComment} className="flex gap-2">
                <img
                  src={resolveUrl(user?.dp)}
                  alt=""
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/dp/default-avatar.svg'; }}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-1.5 border border-softIvory"
                />
                <input
                  type="text"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleComment(e); }}
                  className="flex-1 text-xs px-3 py-2 rounded-full bg-mainBg border border-softIvory/60
                             focus:outline-none focus:border-primaryPink/50 focus:ring-1 focus:ring-primaryPink/20
                             transition-all duration-200 placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-3 py-1.5 bg-primaryPink text-white text-[11px] font-semibold rounded-full
                             hover:brightness-110 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                             active:scale-95 whitespace-nowrap"
                >
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
