/**
 * Feed.jsx
 *
 * Architecture:
 *  - Fetches user posts from GET /api/posts (public, no auth) — works on refresh.
 *  - Interleaves Unsplash photos AND Pexels photos in the masonry grid for a
 *    rich discovery feed. Merge strategy (per page cycle):
 *      post post → unsplash → post post → pexels → post post → unsplash → …
 *    When user posts run out, discovery cards fill the rest of the grid.
 *  - Infinite scroll via IntersectionObserver on the last grid item.
 *    Scroll continues as long as ANY source (posts / Unsplash / Pexels) has more.
 *  - Page counters live in refs (NOT state) so the observer callback always reads
 *    current values without stale-closure bugs or double-fetch race conditions.
 *  - Listens for "postkaro:postCreated" to prepend new posts without a full reload.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { postService } from '../services';
import { fetchPhotos, fetchPexelsPhotos } from '../api';
import PostCard from '../components/PostCard';
import UnsplashCard from '../components/UnsplashCard';
import PexelsCard from '../components/PexelsCard';
import { PostSkeleton } from '../components/Skeleton';

// Items per page requested from each source
const POSTS_PER_PAGE    = 20;
const UNSPLASH_PER_PAGE = 15;
const PEXELS_PER_PAGE   = 15;

// ── Merge helper ──────────────────────────────────────────────────────────────
// Builds a single interleaved array from all three sources.
// Ratio: post post → unsplash → post post → pexels → (repeat)
// Remaining discovery cards are flushed to the tail when user posts run out.
function buildCombined(userPosts, unsplashItems, pexelsItems) {
  const merged = [];
  let uIdx = 0;
  let pIdx = 0;

  for (let i = 0; i < userPosts.length; i++) {
    merged.push({ type: 'post', data: userPosts[i], key: `post-${userPosts[i]._id}` });
    // After every 2nd post → insert 1 Unsplash
    if ((i + 1) % 2 === 0 && uIdx < unsplashItems.length) {
      const u = unsplashItems[uIdx++];
      merged.push({ type: 'unsplash', data: u, key: `unsplash-${u.id}` });
    }
    // After every 4th post → insert 1 Pexels
    if ((i + 1) % 4 === 0 && pIdx < pexelsItems.length) {
      const p = pexelsItems[pIdx++];
      merged.push({ type: 'pexels', data: p, key: `pexels-${p.id}` });
    }
  }

  // Flush remaining discovery cards alternating between sources
  const remaining = Math.max(unsplashItems.length - uIdx, pexelsItems.length - pIdx);
  for (let t = 0; t < remaining; t++) {
    if (uIdx < unsplashItems.length) {
      const u = unsplashItems[uIdx++];
      merged.push({ type: 'unsplash', data: u, key: `unsplash-${u.id}` });
    }
    if (pIdx < pexelsItems.length) {
      const p = pexelsItems[pIdx++];
      merged.push({ type: 'pexels', data: p, key: `pexels-${p.id}` });
    }
  }

  return merged;
}

export default function Feed() {
  // ── Data ─────────────────────────────────────────────────────────────────────
  const [posts,          setPosts]          = useState([]);
  const [unsplashPhotos, setUnsplashPhotos] = useState([]);
  const [pexelsPhotos,   setPexelsPhotos]   = useState([]);
  const [combined,       setCombined]       = useState([]);

  // ── "Has more" flags — scroll continues until ALL sources exhausted ───────────
  const [hasMorePosts,    setHasMorePosts]    = useState(true);
  const [hasMoreUnsplash, setHasMoreUnsplash] = useState(true);
  const [hasMorePexels,   setHasMorePexels]   = useState(true);

  // ── UI ───────────────────────────────────────────────────────────────────────
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const isFetching      = useRef(false);
  const observer        = useRef(null);
  const postPageRef     = useRef(1);
  const unsplashPageRef = useRef(1);
  const pexelsPageRef   = useRef(1);

  // Mirror hasMore in refs so IntersectionObserver always reads current value
  const hasMorePostsRef    = useRef(true);
  const hasMoreUnsplashRef = useRef(true);
  const hasMorePexelsRef   = useRef(true);

  const setHMP = (v) => { hasMorePostsRef.current    = v; setHasMorePosts(v);    };
  const setHMU = (v) => { hasMoreUnsplashRef.current = v; setHasMoreUnsplash(v); };
  const setHMX = (v) => { hasMorePexelsRef.current   = v; setHasMorePexels(v);   };

  // ── Core fetch: all three sources in parallel ────────────────────────────────
  const fetchAll = useCallback(async (pPage, uPage, xPage) => {
    if (isFetching.current) return;
    isFetching.current = true;
    if (pPage > 1) setLoadingMore(true);

    try {
      const [postRes, unsplashRes, pexelsRes] = await Promise.allSettled([
        hasMorePostsRef.current    ? postService.getAll(pPage, POSTS_PER_PAGE)               : Promise.resolve(null),
        hasMoreUnsplashRef.current ? fetchPhotos(uPage, '', UNSPLASH_PER_PAGE)                : Promise.resolve(null),
        hasMorePexelsRef.current   ? fetchPexelsPhotos('', xPage, PEXELS_PER_PAGE)            : Promise.resolve(null),
      ]);

      // ── Posts ──
      let newPosts = [];
      if (postRes.status === 'fulfilled' && postRes.value) {
        newPosts = postRes.value.data?.posts || [];
        setHMP(postRes.value.data?.hasMore ?? false);
        setError(null);
      } else if (postRes.status === 'rejected') {
        console.error('[Feed] Posts error:', postRes.reason?.message);
        if (pPage === 1) setError('Could not load posts. Check your connection.');
        setHMP(false);
      }

      // ── Unsplash ──
      let newUnsplash = [];
      if (unsplashRes.status === 'fulfilled' && unsplashRes.value) {
        newUnsplash = unsplashRes.value.photos || [];
        setHMU(unsplashRes.value.hasMore ?? newUnsplash.length === UNSPLASH_PER_PAGE);
      } else {
        setHMU(false);
      }

      // ── Pexels ──
      let newPexels = [];
      if (pexelsRes.status === 'fulfilled' && pexelsRes.value) {
        newPexels = pexelsRes.value.photos || [];
        setHMX(pexelsRes.value.meta?.hasNextPage ?? newPexels.length === PEXELS_PER_PAGE);
      } else {
        setHMX(false);
        if (pPage === 1 && pexelsRes?.status === 'rejected') {
          console.warn('[Feed] Pexels unavailable — ensure PEXELS_API_KEY is set on the server');
        }
      }

      // ── Merge ──
      setPosts((prevPosts) => {
        const seenP = new Set(prevPosts.map((p) => p._id));
        const freshP = newPosts.filter((p) => !seenP.has(p._id));
        const updatedPosts = pPage === 1 ? newPosts : [...prevPosts, ...freshP];

        setUnsplashPhotos((prevU) => {
          const seenU = new Set(prevU.map((p) => p.id));
          const freshU = newUnsplash.filter((p) => !seenU.has(p.id));
          const updatedU = pPage === 1 ? newUnsplash : [...prevU, ...freshU];

          setPexelsPhotos((prevX) => {
            const seenX = new Set(prevX.map((p) => p.id));
            const freshX = newPexels.filter((p) => !seenX.has(p.id));
            const updatedX = pPage === 1 ? newPexels : [...prevX, ...freshX];
            setCombined(buildCombined(updatedPosts, updatedU, updatedX));
            return updatedX;
          });

          return updatedU;
        });

        return updatedPosts;
      });
    } catch (err) {
      console.error('[Feed] Unexpected error:', err);
      if (pPage === 1) setError('Something went wrong loading the feed.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isFetching.current = false;
    }
  }, []); // stable — mutable state accessed via refs

  // ── Initial fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    postPageRef.current = 1;
    unsplashPageRef.current = 1;
    pexelsPageRef.current = 1;
    fetchAll(1, 1, 1);
  }, [fetchAll]);

  // ── Listen for posts created via CreatePostModal ──────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const newPost = e.detail;
      if (!newPost?._id) return;
      setPosts((prev) => {
        if (prev.some((p) => p._id === newPost._id)) return prev;
        const updated = [newPost, ...prev];
        setUnsplashPhotos((prevU) => {
          setPexelsPhotos((prevX) => {
            setCombined(buildCombined(updated, prevU, prevX));
            return prevX;
          });
          return prevU;
        });
        return updated;
      });
    };
    window.addEventListener('postkaro:postCreated', handler);
    return () => window.removeEventListener('postkaro:postCreated', handler);
  }, []);

  // ── Infinite scroll ───────────────────────────────────────────────────────────
  const hasAnyMore = hasMorePosts || hasMoreUnsplash || hasMorePexels;

  const lastItemRef = useCallback((node) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (
        entries[0].isIntersecting &&
        !isFetching.current &&
        (hasMorePostsRef.current || hasMoreUnsplashRef.current || hasMorePexelsRef.current)
      ) {
        if (hasMorePostsRef.current)    postPageRef.current    += 1;
        if (hasMoreUnsplashRef.current) unsplashPageRef.current += 1;
        if (hasMorePexelsRef.current)   pexelsPageRef.current   += 1;
        fetchAll(postPageRef.current, unsplashPageRef.current, pexelsPageRef.current);
      }
    }, { rootMargin: '500px' });

    if (node) observer.current.observe(node);
  }, [loading, loadingMore, fetchAll]);

  // ── Delete / broken-media handlers ───────────────────────────────────────────
  const handleDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
    setCombined((prev) => prev.filter((item) => item.key !== `post-${postId}`));
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Initial loading skeletons */}
      {loading && (
        <div className="masonry-grid">
          {Array.from({ length: 16 }).map((_, i) => <PostSkeleton key={i} />)}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Failed to load feed</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetchAll(1, 1, 1); }}
            className="btn-primary"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && combined.length === 0 && (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">📸</p>
          <h2 className="text-xl font-bold text-gray-700 mb-2">No posts yet</h2>
          <p className="text-gray-400">Be the first to share something!</p>
        </div>
      )}

      {/* Masonry grid */}
      {!loading && !error && combined.length > 0 && (
        <div className="masonry-grid">
          {combined.map((item, i) => {
            const isLast = i === combined.length - 1;
            if (item.type === 'post') return (
              <div key={item.key} ref={isLast ? lastItemRef : undefined}>
                <PostCard
                  post={item.data}
                  onDelete={handleDelete}
                  onBrokenImage={() => setCombined((prev) => prev.filter((x) => x.key !== item.key))}
                />
              </div>
            );
            if (item.type === 'unsplash') return (
              <div key={item.key} ref={isLast ? lastItemRef : undefined}>
                <UnsplashCard
                  photo={item.data}
                  onBrokenImage={() => setCombined((prev) => prev.filter((x) => x.key !== item.key))}
                />
              </div>
            );
            if (item.type === 'pexels') return (
              <div key={item.key} ref={isLast ? lastItemRef : undefined}>
                <PexelsCard
                  item={item.data}
                  mediaType={item.data.videoFile ? 'video' : 'photo'}
                  onBrokenImage={() => setCombined((prev) => prev.filter((x) => x.key !== item.key))}
                />
              </div>
            );
            return null;
          })}
        </div>
      )}

      {/* Load-more spinner */}
      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border-[3px] border-primaryPink/30 border-t-primaryPink rounded-full animate-spin" />
            <span className="text-sm text-gray-400 font-medium">Loading more…</span>
          </div>
        </div>
      )}

      {/* End of feed */}
      {!hasAnyMore && combined.length > 0 && !loadingMore && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">You've seen everything ✨</p>
        </div>
      )}
    </div>
  );
}

