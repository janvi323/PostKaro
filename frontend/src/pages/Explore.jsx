import { useState, useEffect, useCallback, useRef } from 'react';
import { feedService } from '../services';
import { fetchPhotos } from '../api';
import PostCard from '../components/PostCard';
import UnsplashCard from '../components/UnsplashCard';
import { PostSkeleton } from '../components/Skeleton';

/**
 * Explore page — shows all community posts interleaved with Unsplash photos
 * in a single combined masonry grid with infinite scroll.
 */
export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [postPage, setPostPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  const [unsplashPhotos, setUnsplashPhotos] = useState([]);
  const [unsplashPage, setUnsplashPage] = useState(1);

  const [combined, setCombined] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const observer = useRef(null);
  const isFetching = useRef(false);

  /** Insert 1 Unsplash photo after every 3 user posts */
  const mergeFeeds = (userPosts, photos) => {
    const merged = [];
    let uIdx = 0;

    for (let i = 0; i < userPosts.length; i++) {
      merged.push({ type: 'post', data: userPosts[i], key: `post-${userPosts[i]._id}` });
      if ((i + 1) % 3 === 0 && uIdx < photos.length) {
        merged.push({ type: 'unsplash', data: photos[uIdx], key: `unsplash-${photos[uIdx].id}` });
        uIdx++;
      }
    }
    while (uIdx < photos.length) {
      merged.push({ type: 'unsplash', data: photos[uIdx], key: `unsplash-${photos[uIdx].id}` });
      uIdx++;
    }
    return merged;
  };

  /** Fetch explore posts + Unsplash in parallel, merge them */
  const fetchAll = useCallback(async (pPage, uPage) => {
    if (isFetching.current) return;
    isFetching.current = true;
    if (pPage > 1) setLoadingMore(true);

    try {
      const [postRes, unsplashRes] = await Promise.allSettled([
        feedService.getExplore(pPage, 15),
        fetchPhotos(uPage),
      ]);

      let newPosts = [];
      if (postRes.status === 'fulfilled') {
        newPosts = postRes.value.data.posts || [];
        setHasMorePosts(postRes.value.data.hasMore);
      }

      let newPhotos = [];
      if (unsplashRes.status === 'fulfilled' && unsplashRes.value) {
        newPhotos = unsplashRes.value || [];
      }

      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p._id));
        const fresh = newPosts.filter((p) => !ids.has(p._id));
        const updated = [...prev, ...fresh];
        setUnsplashPhotos((prevU) => {
          const uIds = new Set(prevU.map((p) => p.id));
          const freshU = newPhotos.filter((p) => !uIds.has(p.id));
          const updatedU = [...prevU, ...freshU];
          setCombined(mergeFeeds(updated, updatedU));
          return updatedU;
        });
        return updated;
      });
    } catch (err) {
      console.error('Explore fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => { fetchAll(1, 1); }, [fetchAll]);

  const lastItemRef = useCallback(
    (node) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !isFetching.current) {
            setPostPage((prev) => {
              const nextP = prev + 1;
              setUnsplashPage((prevU) => {
                const nextU = prevU + 1;
                fetchAll(nextP, nextU);
                return nextU;
              });
              return nextP;
            });
          }
        },
        { rootMargin: '400px' }
      );
      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, fetchAll]
  );

  const handleDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
    setCombined((prev) => prev.filter((item) => !(item.type === 'post' && item.data._id === postId)));
  };

  const handleBrokenPost = (postId) => {
    setCombined((prev) => prev.filter((item) => !(item.type === 'post' && item.data._id === postId)));
  };

  const handleBrokenUnsplash = (unsplashId) => {
    setCombined((prev) => prev.filter((item) => !(item.type === 'unsplash' && item.data.id === unsplashId)));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
          Explore <span className="text-brandGreen">PostKaro</span>
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Discover amazing content from the community</p>
      </div>

      {loading ? (
        <div className="masonry-grid">
          {Array.from({ length: 16 }).map((_, i) => <PostSkeleton key={i} />)}
        </div>
      ) : combined.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">🔍</p>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Nothing to explore yet</h2>
          <p className="text-gray-400">Check back later for new content!</p>
        </div>
      ) : (
        <div className="masonry-grid">
          {combined.map((item, i) => (
            <div key={item.key} ref={i === combined.length - 1 ? lastItemRef : undefined}>
              {item.type === 'post' ? (
                <PostCard
                  post={item.data}
                  onDelete={handleDelete}
                  onBrokenImage={() => handleBrokenPost(item.data._id)}
                />
              ) : (
                <UnsplashCard
                  photo={item.data}
                  onBrokenImage={() => handleBrokenUnsplash(item.data.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border-[3px] border-brandGreen/30 border-t-brandGreen rounded-full animate-spin" />
            <span className="text-sm text-gray-400 font-medium">Loading more…</span>
          </div>
        </div>
      )}

      {!hasMorePosts && combined.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">You've explored everything ✨</p>
        </div>
      )}
    </div>
  );
}
