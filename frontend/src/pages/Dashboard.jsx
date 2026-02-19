import { useState, useEffect } from 'react';
import { feedService } from '../services';
import PostCard from '../components/PostCard';
import { PostSkeleton } from '../components/Skeleton';

export default function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    feedService
      .getDashboard()
      .then((res) => setPosts(res.data.posts || []))
      .catch((err) => {
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Failed to load your posts. Please try again.';
        console.error('[Dashboard] fetch error:', err.response?.status, msg);
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        My <span className="text-primaryPink">Dashboard</span>
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primaryPink">{posts.length}</p>
          <p className="text-xs text-gray-400">Posts</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brandGreen">
            {posts.reduce((a, p) => a + (p.likes?.length || 0), 0)}
          </p>
          <p className="text-xs text-gray-400">Total Likes</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-secondaryPink">
            {posts.reduce((a, p) => a + (p.comments?.length || 0), 0)}
          </p>
          <p className="text-xs text-gray-400">Total Comments</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-lightGreen">
            {posts.reduce((a, p) => a + (p.views?.length || 0), 0)}
          </p>
          <p className="text-xs text-gray-400">Total Views</p>
        </div>
      </div>

      {loading ? (
        <div className="masonry-grid">
          {Array.from({ length: 8 }).map((_, i) => <PostSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">⚠️</p>
          <p className="text-red-500 font-medium mb-2">Could not load your posts</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null);
              feedService.getDashboard()
                .then((res) => setPosts(res.data.posts || []))
                .catch((err) => setError(err.response?.data?.message || err.message))
                .finally(() => setLoading(false)); }}
            className="mt-4 px-5 py-2 bg-primaryPink text-white text-sm rounded-full hover:brightness-110 transition-all"
          >
            Retry
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📊</p>
          <p>No posts yet. Create your first post!</p>
        </div>
      ) : (
        <div className="masonry-grid">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onDelete={(id) => setPosts((p) => p.filter((x) => x._id !== id))}
              // NOTE: onBrokenImage is intentionally omitted here.
              // On the Dashboard you own all your posts — if a file is missing
              // (e.g. Render ephemeral disk wiped) we still show the card with
              // the caption/likes/comments and a "Media unavailable" placeholder
              // instead of silently removing the post from view.
            />
          ))}
        </div>
      )}
    </div>
  );
}
