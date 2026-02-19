import { useState, useRef } from 'react';
import {
  HiHeart, HiBookmark, HiChat, HiExternalLink, HiX,
} from 'react-icons/hi';
import { unsplashService } from '../services';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * UnsplashCard — full-featured card for Unsplash photos.
 * Supports real likes, saves, and comments stored in the backend.
 * Matches the PostCard visual style exactly.
 *
 * Props:
 *  photo          — Unsplash photo object from the API
 *  onBrokenImage  — called when the image fails to load (parent removes the card)
 */
export default function UnsplashCard({ photo, onBrokenImage }) {
  const { user } = useAuth();

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(photo?.likes || 0);
  const [saved, setSaved] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [deletingComment, setDeletingComment] = useState(null);
  const [interactionsLoaded, setInteractionsLoaded] = useState(false);

  const loadedRef = useRef(false);

  if (!photo) return null;

  // Build a small metadata snapshot sent with mutating requests so the
  // backend can create the interaction document on first touch.
  const meta = {
    photoUrl: photo.urls?.small || '',
    description: photo.description || photo.alt_description || '',
    photographerName: photo.user?.name || '',
    photographerAvatar: photo.user?.profile_image?.small || '',
    originalLikes: photo.likes || 0,
  };

  // Lazy-load interactions only when the comment panel is first opened
  const loadInteractions = async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const res = await unsplashService.getInteractions(photo.id);
      setLiked(res.data.liked);
      setSaved(res.data.saved);
      setLikesCount(res.data.likesCount);
      setComments(res.data.comments || []);
      setInteractionsLoaded(true);
    } catch {
      // silently ignore — treat as zero interactions
      setInteractionsLoaded(true);
    }
  };

  const handleLike = async () => {
    if (!user) return toast.error('Log in to like posts');
    await loadInteractions();
    try {
      const next = !liked;
      setLiked(next);
      setLikesCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
      await unsplashService.toggleLike(photo.id, meta);
    } catch {
      setLiked((l) => !l);
      setLikesCount((c) => (liked ? c + 1 : Math.max(0, c - 1)));
      toast.error('Failed to update like');
    }
  };

  const handleSave = async () => {
    if (!user) return toast.error('Log in to save posts');
    await loadInteractions();
    try {
      const next = !saved;
      setSaved(next);
      toast.success(next ? 'Post saved!' : 'Post unsaved');
      await unsplashService.toggleSave(photo.id, meta);
    } catch {
      setSaved((s) => !s);
      toast.error('Failed to save post');
    }
  };

  const handleOpenComments = async () => {
    setShowComments((v) => !v);
    await loadInteractions();
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!user) return toast.error('Log in to comment');
    try {
      const res = await unsplashService.addComment(photo.id, commentText.trim(), meta);
      setComments((prev) => [...prev, res.data.comment]);
      setCommentText('');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    setDeletingComment(commentId);
    try {
      await unsplashService.deleteComment(photo.id, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch {
      toast.error('Failed to delete comment');
    } finally {
      setDeletingComment(null);
    }
  };

  const resolveAvatar = (url) => url || '/images/dp/default-avatar.svg';

  return (
    <div className="masonry-item">
      <div className="card overflow-hidden group cursor-pointer">
        {/* ── Image ── */}
        {/* NOTE: Never use 'hidden' on lazy images — keeps them out of the viewport
             so the browser's lazy-loader never fires. Use opacity-0 instead. */}
        <div className="relative overflow-hidden rounded-t-2xl"
             style={{ minHeight: imgLoaded ? 'auto' : '160px' }}>
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 skeleton" />
          )}
          <img
            src={photo.urls?.regular || photo.urls?.small}
            alt={photo.alt_description || 'Unsplash photo'}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgError(true);
              // Remove card from Feed — no broken placeholder shown
              onBrokenImage?.();
            }}
            className={`w-full object-cover group-hover:scale-105 transition-all duration-500
                        ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Save button — top right */}
          <button
            onClick={handleSave}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full shadow-md flex items-center justify-center
                        transition-all duration-300 opacity-0 group-hover:opacity-100 active:scale-95
                        ${saved
                          ? 'bg-primaryPink text-white'
                          : 'bg-white/80 backdrop-blur-sm text-gray-500 hover:bg-primaryPink hover:text-white'}`}
          >
            <HiBookmark className="w-4 h-4" />
          </button>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent
                          opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out
                          flex items-end justify-between p-3 pointer-events-none group-hover:pointer-events-auto">
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 text-white drop-shadow transition-transform hover:scale-110 active:scale-95"
            >
              <HiHeart className={`w-6 h-6 drop-shadow-lg transition-colors
                                   ${liked ? 'text-secondaryPink fill-current' : ''}`} />
              <span className="text-sm font-bold drop-shadow-lg">{likesCount}</span>
            </button>
            <button
              onClick={handleOpenComments}
              className="flex items-center gap-1.5 text-white drop-shadow transition-transform hover:scale-110"
            >
              <HiChat className="w-6 h-6 drop-shadow-lg" />
              <span className="text-sm font-bold drop-shadow-lg">{comments.length}</span>
            </button>
          </div>
        </div>

        {/* ── Card body ── */}
        <div className="p-3">
          {/* Author row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              {photo.user?.profile_image?.small ? (
                <img
                  src={photo.user.profile_image.small}
                  alt={photo.user.name}
                  className="w-7 h-7 rounded-full object-cover border-2 border-softIvory flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-mainBg flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primaryPink">
                    {(photo.user?.name || 'U')[0]}
                  </span>
                </div>
              )}
              <span className="text-xs font-semibold text-gray-600 truncate">
                {photo.user?.name || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <a
                href={photo.links?.html || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-mainBg rounded-lg transition-all duration-200 text-gray-400 hover:text-gray-600"
              >
                <HiExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-mainBg text-primaryPink font-semibold">
                Unsplash
              </span>
            </div>
          </div>

          {/* Caption */}
          {(photo.description || photo.alt_description) && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">
              {photo.description || photo.alt_description}
            </p>
          )}

          {/* Quick action bar */}
          <div className="flex items-center gap-3 pt-2 border-t border-softIvory/40">
            <button onClick={handleLike} className="flex items-center gap-1 group/like">
              <HiHeart className={`w-4 h-4 transition-all duration-200 group-hover/like:scale-125
                ${liked ? 'text-primaryPink fill-current' : 'text-gray-400 group-hover/like:text-primaryPink'}`} />
              <span className="text-xs text-gray-400 font-medium">{likesCount}</span>
            </button>
            <button onClick={handleOpenComments} className="flex items-center gap-1 group/chat">
              <HiChat className={`w-4 h-4 transition-all duration-200 group-hover/chat:scale-110
                ${showComments ? 'text-primaryPink' : 'text-gray-400 group-hover/chat:text-primaryPink'}`} />
              <span className="text-xs text-gray-400 font-medium">{comments.length}</span>
            </button>
          </div>

          {/* ── Comments section ── */}
          {showComments && (
            <div className="mt-3 animate-fade-in">
              {comments.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-2 mb-3 pr-1">
                  {comments.map((c, i) => {
                    const canDelete = user?._id === (c.user?._id || c.user);
                    return (
                      <div
                        key={c._id || i}
                        className="flex gap-2 p-2 rounded-xl bg-mainBg/60 group/comment relative"
                      >
                        <img
                          src={resolveAvatar(c.user?.dp)}
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
                            className="opacity-0 group-hover/comment:opacity-100 p-0.5 text-gray-300
                                       hover:text-red-400 transition-all duration-200 flex-shrink-0"
                          >
                            <HiX className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 text-center py-2 mb-2">
                  {interactionsLoaded ? 'Be the first to comment!' : 'Loading…'}
                </p>
              )}

              <form onSubmit={handleComment} className="flex gap-2">
                <img
                  src={resolveAvatar(user?.dp)}
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
                             hover:brightness-110 transition-all duration-200 disabled:opacity-40
                             disabled:cursor-not-allowed active:scale-95 whitespace-nowrap"
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
