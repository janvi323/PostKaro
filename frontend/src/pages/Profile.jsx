import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { profileService, followService } from '../services';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import PostCard from '../components/PostCard';
import { ProfileSkeleton } from '../components/Skeleton';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function resolveUrl(url) {
  if (!url) return `${API_BASE}/images/default-avatar.svg`;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function Profile() {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  const { isOnline } = useSocket();
  const [profile, setProfile] = useState(null);
  const [followStatus, setFollowStatus] = useState('not_following');
  const [canViewPosts, setCanViewPosts] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        let res;
        if (!id || id === authUser?._id) {
          res = await profileService.getMyProfile();
          setIsOwnProfile(true);
        } else {
          res = await profileService.getProfile(id);
          setIsOwnProfile(res.data.isOwnProfile);
        }
        setProfile(res.data.user);
        setFollowStatus(res.data.followStatus || 'self');
        setCanViewPosts(res.data.canViewPosts !== false);
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, authUser]);

  const handleFollow = async () => {
    try {
      if (followStatus === 'following') {
        await followService.unfollow(profile._id);
        setFollowStatus('not_following');
        toast.success('Unfollowed');
      } else if (followStatus === 'requested') {
        await followService.unfollow(profile._id);
        setFollowStatus('not_following');
        toast.success('Request cancelled');
      } else {
        const res = await followService.follow(profile._id);
        setFollowStatus(res.data.status);
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  if (loading) return <ProfileSkeleton />;
  if (!profile) return <div className="text-center py-20 text-gray-500">Profile not found</div>;

  const dpUrl = resolveUrl(profile.dp);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile header with cover */}
      <div className="card overflow-hidden mb-8">
        {/* Gradient cover */}
        <div className="h-36 bg-gradient-to-br from-primaryPink via-secondaryPink to-lightGreen relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoMnY0aC0yem0tNiA2di00aDJ2NGgtMnptMC02di00aDJ2NGgtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        </div>

        <div className="px-8 pb-8 -mt-16 relative">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <img src={dpUrl} alt={profile.username}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-premium ring-4 ring-softIvory/40" />
              {!isOwnProfile && isOnline(profile._id) && (
                <div className="absolute bottom-2 right-2 w-5 h-5 bg-primaryGreen rounded-full border-3 border-white shadow-glow-green" />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left mt-2">
              <h1 className="text-2xl font-bold text-gray-700">{profile.fullname}</h1>
              <p className="text-gray-400 text-sm mb-1">@{profile.username}</p>
              {profile.bio && <p className="text-gray-600 text-sm mb-3 max-w-lg">{profile.bio}</p>}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer"
                  className="text-brandGreen text-sm font-medium hover:underline inline-flex items-center gap-1">
                  {profile.website}
                </a>
              )}

              {/* Stats */}
              <div className="flex items-center gap-8 mt-4 justify-center sm:justify-start">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-700">{profile.posts?.length || 0}</p>
                  <p className="text-xs text-gray-400 font-medium">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-700">{profile.followers?.length || 0}</p>
                  <p className="text-xs text-gray-400 font-medium">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-700">{profile.following?.length || 0}</p>
                  <p className="text-xs text-gray-400 font-medium">Following</p>
                </div>
              </div>
            </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {isOwnProfile ? (
              <Link to="/settings" className="btn-soft text-sm text-center">Edit Profile</Link>
            ) : (
              <>
                <button onClick={handleFollow}
                  className={`px-6 py-2 rounded-2xl font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-xl ${
                    followStatus === 'following'
                      ? 'bg-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-500'
                      : followStatus === 'requested'
                      ? 'bg-softIvory/60 text-gray-700'
                      : 'btn-primary'
                  }`}>
                  {followStatus === 'following' ? 'Following' : followStatus === 'requested' ? 'Requested' : 'Follow'}
                </button>
                {followStatus === 'following' && (
                  <Link to={`/chat/${profile._id}`}
                    className="btn-green text-sm text-center">Message</Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Tabs */}
      {isOwnProfile && (
        <div className="flex gap-1 mb-6 bg-white/50 rounded-2xl p-1">
          {['posts', 'saved'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-primaryPink text-white shadow-md'
                  : 'text-gray-500 hover:bg-pink-50'
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Posts grid */}
      {!canViewPosts ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-gray-700 mb-2">This account is private</h2>
          <p className="text-gray-400">Follow to see their posts</p>
        </div>
      ) : (
        <div className="masonry-grid">
          {(activeTab === 'saved' ? profile.savedPosts : profile.posts)?.map((post) => (
            <PostCard key={post._id} post={post}
              onDelete={(pid) => setProfile((p) => ({ ...p, posts: p.posts.filter((x) => x._id !== pid) }))} />
          ))}
        </div>
      )}

      {canViewPosts && (activeTab === 'saved' ? profile.savedPosts : profile.posts)?.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">{activeTab === 'saved' ? '📌' : '📷'}</p>
          <p>No {activeTab} yet</p>
        </div>
      )}
    </div>
  );
}
