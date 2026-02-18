import { useState, useEffect } from 'react';
import { feedService } from '../services';
import PostCard from '../components/PostCard';
import { PostSkeleton } from '../components/Skeleton';

export default function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feedService
      .getDashboard()
      .then((res) => setPosts(res.data.posts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        My <span className="text-strongPink">Dashboard</span>
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-strongPink">{posts.length}</p>
          <p className="text-xs text-gray-400">Posts</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primaryGreen">
            {posts.reduce((a, p) => a + (p.likes?.length || 0), 0)}
          </p>
          <p className="text-xs text-gray-400">Total Likes</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-softPink">
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
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📊</p>
          <p>No posts yet. Create your first post!</p>
        </div>
      ) : (
        <div className="masonry-grid">
          {posts.map((post) => (
            <PostCard key={post._id} post={post}
              onDelete={(id) => setPosts((p) => p.filter((x) => x._id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}
