import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiHeart, HiChat, HiBookmark, HiShare, HiTrash, HiPlay,
  HiArrowLeft, HiDotsVertical, HiX, HiPencil, HiCheck,
} from 'react-icons/hi';
import { postService, feedService } from '../services';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { PostSkeleton } from '../components/Skeleton';
import toast from 'react-hot-toast';

// ── Resolve relative backend paths to absolute URLs ──────────────────────────
const API_BASE = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_BACKEND_URL
      || import.meta.env.VITE_SOCKET_URL
      || (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')
      || '');

function resolveUrl(url) {
  if (!url) return '/images/dp/default-avatar.svg';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ── Full-size media component ─────────────────────────────────────────────────
function DetailMedia({ post }) {
  const [playing, setPlaying]   = useState(false);
  const [muted, setMuted]       = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError]  = useState(false);
  const videoRef = useRef(null);

  const mediaUrl = resolveUrl(post.fileUrl);
  const isVideo  = post.fileType === 'video' || mediaUrl?.match(/\.(mp4|webm|mov)$/i);

  if (imgError) {
    return (
      <div className="w-full rounded-2xl bg-gradient-to-br from-pink-50 to-gray-100
                      flex flex-col items-center justify-center" style={{ minHeight: 320 }}>
        <span className="text-5xl mb-3 opacity-30">🖼️</span>
        <p className="text-sm text-gray-400">Media unavailable</p>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={mediaUrl}
          className="w-full max-h-[80vh] object-contain"
          loop
          muted={muted}
          playsInline
          controls={playing}
          onError={() => setImgError(true)}
        />
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20"
            onClick={() => { videoRef.current?.play(); setPlaying(true); }}>
            <div className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center
                            hover:bg-black/70 transition-all hover:scale-110">
              <HiPlay className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        )}
        {playing && (
          <button
            onClick={() => setMuted((m) => !m)}
            className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white
                       text-xs rounded-full hover:bg-black/70 transition-all"
          >
            {muted ? '🔇' : '🔊'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden"
         style={{ minHeight: imgLoaded ? 'auto' : 320 }}>
      {!imgLoaded && <div className="absolute inset-0 skeleton rounded-2xl" style={{ minHeight: 320 }} />}
      <img
        src={mediaUrl}
        alt={post.caption || 'Post'}
        className={`w-full object-contain max-h-[80vh] rounded-2xl transition-opacity duration-300
                    ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PostDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [post,     setPost]     = useState(null);
  const [related,  setRelated]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Interaction state
  const [liked,        setLiked]        = useState(false);
  const [likesCount,   setLikesCount]   = useState(0);
  const [saved,        setSaved]        = useState(false);
  const [comments,     setComments]     = useState([]);
  const [commentText,  setCommentText]  = useState('');
  const [showMenu,     setShowMenu]     = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [editCaption,  setEditCaption]  = useState('');
  const [deletingCmt,  setDeletingCmt]  = useState(null);

  // ── Fetch post ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await postService.getPost(id);
        if (cancelled) return;
        const p = res.data.post;
        setPost(p);
        setRelated(res.data.related || []);
        setLiked(p.likes?.some((l) => l.user === user?._id || l.user?._id === user?._id));
        setLikesCount(p.likes?.length || 0);
        setSaved(p.saved || false);
        setComments(p.comments || []);
        setEditCaption(p.caption || '');
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Post not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, user?._id]);

  // Track view
  useEffect(() => {
    if (!post?._id || !user) return;
    postService.viewPost?.(post._id).catch(() => {});
  }, [post?._id, user]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLike = async () => {
    try {
      if (liked) { setLiked(false); setLikesCount((c) => c - 1); await postService.unlikePost(post._id); }
      else        { setLiked(true);  setLikesCount((c) => c + 1); await postService.likePost(post._id); }
    } catch {
      setLiked((l) => !l);
      setLikesCount((c) => liked ? c + 1 : c - 1);
      toast.error('Failed to update like');
    }
  };

  const handleSave = async () => {
    try { setSaved((s) => !s); await feedService.savePost(post._id); toast.success(saved ? 'Unsaved' : 'Saved!'); }
    catch { setSaved((s) => !s); }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      await postService.sharePost(post._id, 'copy_link');
      toast.success('Link copied!');
    } catch { toast.error('Failed to copy link'); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await postService.commentPost(post._id, commentText.trim());
      setComments((prev) => [...prev, res.data.comment]);
      setCommentText('');
    } catch { toast.error('Failed to add comment'); }
  };

  const handleDeleteComment = async (commentId) => {
    setDeletingCmt(commentId);
    try {
      await postService.deleteComment(post._id, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch { toast.error('Failed to delete comment'); }
    finally { setDeletingCmt(null); }
  };

  const handleSaveCaption = async () => {
    try {
      await postService.editPost(post._id, editCaption);
      setPost((p) => ({ ...p, caption: editCaption }));
      setEditMode(false);
      toast.success('Caption updated');
    } catch { toast.error('Failed to update caption'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await postService.deletePost(post._id);
      toast.success('Post deleted');
      navigate(-1);
    } catch { toast.error('Failed to delete post'); }
  };

  const handleRelatedDelete = useCallback((postId) => {
    setRelated((prev) => prev.filter((p) => p._id !== postId));
  }, []);

  const isOwner = user?._id === (post?.user?._id || post?.user);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 animate-pulse">
          <div className="lg:w-[55%] skeleton rounded-2xl" style={{ minHeight: 500 }} />
          <div className="lg:w-[45%] space-y-4">
            <div className="skeleton h-10 w-32 rounded-full" />
            <div className="skeleton h-5 w-full rounded-lg" />
            <div className="skeleton h-5 w-3/4 rounded-lg" />
            <div className="skeleton h-40 rounded-xl mt-6" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Post not found</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-primary">Go back</button>
      </div>
    );
  }

  const userDp = resolveUrl(post.user?.dp);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primaryPink
                   transition-colors mb-5 group"
      >
        <HiArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </button>

      {/* ── Pinterest-style split: image left, details right ── */}
      <div className="bg-white rounded-3xl shadow-card overflow-hidden flex flex-col lg:flex-row">

        {/* Left — large media */}
        <div className="lg:w-[55%] bg-gray-50 flex items-center justify-center p-4 lg:p-6 lg:sticky lg:top-20 lg:self-start">
          <DetailMedia post={post} />
        </div>

        {/* Right — details */}
        <div className="lg:w-[45%] flex flex-col p-5 lg:p-7 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">

          {/* Action bar + owner menu */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Like */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold
                            transition-all duration-200 active:scale-95
                            ${liked
                              ? 'bg-primaryPink text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-pink-50 hover:text-primaryPink'}`}
              >
                <HiHeart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                {likesCount}
              </button>

              {/* Save */}
              <button
                onClick={handleSave}
                className={`p-2 rounded-full transition-all duration-200 active:scale-95
                            ${saved
                              ? 'bg-primaryPink text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-pink-50 hover:text-primaryPink'}`}
              >
                <HiBookmark className="w-4 h-4" />
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-gray-100 text-gray-500
                           hover:bg-pink-50 hover:text-primaryPink transition-all active:scale-95"
              >
                <HiShare className="w-4 h-4" />
              </button>
            </div>

            {/* Owner menu */}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu((m) => !m)}
                  className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                >
                  <HiDotsVertical className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-card-hover
                                  border border-softIvory/40 z-20 animate-scale-in">
                    <button
                      onClick={() => { setEditMode(true); setShowMenu(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-600
                                 hover:bg-mainBg rounded-t-xl transition-colors"
                    >
                      <HiPencil className="w-4 h-4" /> Edit caption
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-500
                                 hover:bg-red-50 rounded-b-xl transition-colors"
                    >
                      <HiTrash className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Caption */}
          {editMode ? (
            <div className="mb-4">
              <textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows={3}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-softIvory/60
                           focus:outline-none focus:border-primaryPink/50 focus:ring-1 focus:ring-primaryPink/20
                           resize-none transition-all"
                placeholder="Write a caption…"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveCaption}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primaryPink text-white
                             text-xs font-semibold rounded-full hover:brightness-110 transition-all active:scale-95"
                >
                  <HiCheck className="w-3.5 h-3.5" /> Save
                </button>
                <button
                  onClick={() => { setEditMode(false); setEditCaption(post.caption || ''); }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold
                             rounded-full hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            post.caption && (
              <p className="text-gray-700 text-sm leading-relaxed mb-4">{post.caption}</p>
            )
          )}

          {/* User */}
          <Link
            to={`/profile/${post.user?._id}`}
            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-mainBg transition-colors group mb-5"
          >
            <img
              src={userDp}
              alt=""
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/dp/default-avatar.svg'; }}
              className="w-10 h-10 rounded-full object-cover border-2 border-softIvory flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-700 group-hover:text-primaryPink transition-colors truncate">
                {post.user?.fullname || post.user?.username}
              </p>
              <p className="text-xs text-gray-400 truncate">@{post.user?.username}</p>
            </div>
          </Link>

          {/* Divider */}
          <div className="border-t border-softIvory/60 mb-4" />

          {/* Comments */}
          <div className="flex items-center gap-2 mb-3">
            <HiChat className="w-4 h-4 text-primaryPink" />
            <span className="text-sm font-semibold text-gray-700">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1 max-h-72 lg:max-h-none">
            {comments.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No comments yet. Be the first!</p>
            )}
            {comments.map((c, i) => {
              const canDelete = isOwner || user?._id === (c.user?._id || c.user);
              return (
                <div
                  key={c._id || i}
                  className="flex gap-2.5 p-2.5 rounded-xl bg-mainBg/60 group/comment"
                >
                  <img
                    src={resolveUrl(c.user?.dp)}
                    alt=""
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/dp/default-avatar.svg'; }}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5 border border-softIvory"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-700">{c.user?.username || 'user'}</span>
                    <span className="text-xs text-gray-500 ml-2 break-words">{c.text}</span>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteComment(c._id)}
                      disabled={deletingCmt === c._id}
                      className="opacity-0 group-hover/comment:opacity-100 p-1 text-gray-300
                                 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <HiX className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add comment */}
          {user && (
            <form onSubmit={handleComment} className="flex gap-2 pt-3 border-t border-softIvory/60">
              <img
                src={resolveUrl(user.dp)}
                alt=""
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/dp/default-avatar.svg'; }}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5 border border-softIvory"
              />
              <input
                type="text"
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 text-sm px-3 py-2 rounded-full bg-mainBg border border-softIvory/60
                           focus:outline-none focus:border-primaryPink/50 focus:ring-1 focus:ring-primaryPink/20
                           transition-all placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-primaryPink text-white text-xs font-semibold rounded-full
                           hover:brightness-110 transition-all active:scale-95
                           disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Post
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── More posts ── */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-bold text-gray-800 mb-5">More posts</h2>
          <div className="masonry-grid">
            {related.map((p) => (
              <PostCard key={p._id} post={p} onDelete={handleRelatedDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
