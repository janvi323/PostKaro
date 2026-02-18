import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { followService } from '../services';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiSearch, FiUserPlus, FiCheck, FiClock } from 'react-icons/fi';

export default function FindPeople() {
  const { user: me } = useAuth();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followStates, setFollowStates] = useState({});

  useEffect(() => {
    if (!query.trim()) { setUsers([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      followService
        .search(query)
        .then((res) => {
          const list = (res.data.users || []).filter((u) => u._id !== me._id);
          setUsers(list);
          // Use followStatus from search response directly
          list.forEach((u) => {
            setFollowStates((prev) => ({ ...prev, [u._id]: { status: u.followStatus || 'not_following' } }));
          });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [query, me._id]);

  const handleFollow = async (userId) => {
    try {
      const res = await followService.follow(userId);
      setFollowStates((prev) => ({
        ...prev,
        [userId]: { status: res.data.status },
      }));
      toast.success(res.data.status === 'requested' ? 'Follow request sent' : 'Following!');
    } catch {
      toast.error('Failed');
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await followService.unfollow(userId);
      setFollowStates((prev) => ({
        ...prev,
        [userId]: { status: 'not_following' },
      }));
      toast.success('Unfollowed');
    } catch {
      toast.error('Failed');
    }
  };

  const getButton = (userId) => {
    const s = followStates[userId];
    if (!s) return null;
    if (s.status === 'following') {
      return (
        <button onClick={() => handleUnfollow(userId)}
          className="btn-soft px-3 py-1.5 text-sm flex items-center gap-1">
          <FiCheck /> Following
        </button>
      );
    }
    if (s.status === 'requested') {
      return (
        <button onClick={() => handleUnfollow(userId)}
          className="btn-soft px-3 py-1.5 text-sm flex items-center gap-1 opacity-75">
          <FiClock /> Requested
        </button>
      );
    }
    return (
      <button onClick={() => handleFollow(userId)}
        className="btn-green px-3 py-1.5 text-sm flex items-center gap-1">
        <FiUserPlus /> Follow
      </button>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Find People</h1>

      {/* Search */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          className="input-field pl-10" placeholder="Search by name or username..." autoFocus />
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u._id} className="card p-4 flex items-center gap-4">
              <Link to={`/profile/${u._id}`}>
                <img src={u.dp || '/images/dp/default-avatar.svg'}
                  className="w-12 h-12 rounded-full object-cover" alt="" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${u._id}`} className="font-semibold text-sm hover:underline">
                  {u.fullname || u.username}
                </Link>
                <p className="text-xs text-gray-400">@{u.username}</p>
                {u.bio && <p className="text-xs text-gray-500 mt-1 truncate">{u.bio}</p>}
              </div>
              {getButton(u._id)}
            </div>
          ))}
        </div>
      )}

      {!loading && query && users.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🔍</p>
          <p>No users found for "{query}"</p>
        </div>
      )}

      {!query && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🌍</p>
          <p>Start typing to discover people</p>
        </div>
      )}
    </div>
  );
}
