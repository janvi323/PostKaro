import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiSearch, HiPlus, HiBell, HiChat, HiX } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { feedService, userService } from '../services';

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function resolveUrl(url) {
  if (!url) return `${API_BASE}/images/dp/default-avatar.svg`;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function Navbar({ onCreatePost }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      feedService.getNotificationCounts().then((r) => setCounts(r.data)).catch(() => {});
    }, 15000);
    feedService.getNotificationCounts().then((r) => setCounts(r.data)).catch(() => {});
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = useCallback((val) => {
    setSearch(val);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (val.length < 2) {
      setResults([]);
      setShowSearch(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setShowSearch(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await userService.search(val);
        setResults(res.data.users || []);
      } catch (err) {
        if (err?.name !== 'CanceledError') setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const clearSearch = () => {
    setSearch('');
    setResults([]);
    setShowSearch(false);
    setActiveIndex(-1);
  };

  const selectUser = (u) => {
    navigate(`/profile/${u._id}`);
    clearSearch();
  };

  const handleKeyDown = (e) => {
    if (!showSearch || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectUser(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowSearch(false);
      setActiveIndex(-1);
    }
  };

  const dpUrl = resolveUrl(user?.dp);

  return (
    <nav className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-softIvory/50 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/feed" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-primaryPink rounded-xl flex items-center justify-center shadow-md
                          group-hover:scale-110 transition-transform duration-300">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-xl font-bold text-gray-800 hidden sm:block tracking-tight">
            Post<span className="text-primaryPink">Karo</span>
          </span>
        </Link>

        {/* Search */}
        <div className="relative flex-1 max-w-md mx-4" ref={searchRef}>
          <div className="relative">
            <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search people..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (results.length > 0) setShowSearch(true); }}
              className="w-full pl-10 pr-10 py-2 rounded-full bg-mainBg/60 border border-lightGreen/30
                         focus:bg-white focus:border-primaryPink/50 focus:ring-2 focus:ring-primaryPink/20
                         transition-all duration-300 text-sm placeholder-gray-400 outline-none"
            />
            {search && (
              <button onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-softIvory/50 rounded-full transition-colors">
                <HiX className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {showSearch && (
            <div className="absolute top-full mt-2 w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-card-hover border border-softIvory/40
                            overflow-hidden z-50 animate-slide-down max-h-80 overflow-y-auto">
              {searchLoading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <div className="w-5 h-5 border-2 border-primaryPink/30 border-t-primaryPink rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">Searching...</span>
                </div>
              ) : results.length > 0 ? (
                results.map((u, i) => (
                  <button
                    key={u._id}
                    onClick={() => selectUser(u)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-all duration-200
                               ${i === activeIndex ? 'bg-softIvory/40' : 'hover:bg-mainBg/60'}`}
                  >
                    <img
                      src={resolveUrl(u.dp)}
                      alt={u.username}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/dp/default-avatar.svg'; }}
                      className="w-9 h-9 rounded-full object-cover border-2 border-softIvory"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{u.fullname}</p>
                      <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                    </div>
                    <span className="text-[10px] text-gray-300 font-medium">
                      {u.followersCount || 0} followers
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400">No users found</p>
                  <p className="text-xs text-gray-300 mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCreatePost}
            className="hidden sm:flex items-center gap-2 bg-primaryPink text-white px-5 py-2 rounded-full
                       font-semibold text-sm hover:brightness-110 transition-all duration-300 shadow-md hover:shadow-glow-pink
                       active:scale-95"
          >
            <HiPlus className="w-4 h-4" />
            Create
          </button>

          {/* Mobile create */}
          <button
            onClick={onCreatePost}
            className="sm:hidden p-2.5 bg-primaryPink text-white rounded-full shadow-md hover:brightness-110 transition-all duration-300"
          >
            <HiPlus className="w-5 h-5" />
          </button>

          <Link to="/conversations" className="relative p-2.5 hover:bg-softIvory/40 rounded-full transition-all duration-300">
            <HiChat className="w-5 h-5 text-gray-500" />
            {counts.messages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-primaryPink text-white text-[10px]
                               rounded-full flex items-center justify-center font-bold shadow-sm">
                {counts.messages > 9 ? '9+' : counts.messages}
              </span>
            )}
          </Link>

          <Link to="/notifications" className="relative p-2.5 hover:bg-softIvory/40 rounded-full transition-all duration-300">
            <HiBell className="w-5 h-5 text-gray-500" />
            {counts.notifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-brandGreen text-white text-[10px]
                               rounded-full flex items-center justify-center font-bold shadow-sm">
                {counts.notifications > 9 ? '9+' : counts.notifications}
              </span>
            )}
          </Link>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu((p) => !p)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-softIvory/40 transition-all duration-300"
            >
              <img
                src={dpUrl}
                alt="avatar"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/dp/default-avatar.svg'; }}
                className="w-8 h-8 rounded-full object-cover border-2 border-secondaryPink/50 hover:border-primaryPink transition-colors duration-300"
              />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-card-hover border border-softIvory/40 overflow-hidden z-50 animate-slide-down">
                <div className="px-4 py-3 border-b border-softIvory/30">
                  <p className="text-sm font-bold text-gray-800 truncate">{user?.fullname}</p>
                  <p className="text-xs text-gray-400 truncate">@{user?.username}</p>
                </div>
                <Link to={`/profile/${user?._id}`} onClick={() => setShowMenu(false)}
                  className="block px-4 py-2.5 hover:bg-mainBg text-sm font-medium text-gray-600 transition-all duration-200">
                  My Profile
                </Link>
                <Link to="/dashboard" onClick={() => setShowMenu(false)}
                  className="block px-4 py-2.5 hover:bg-mainBg text-sm font-medium text-gray-600 transition-all duration-200">
                  Dashboard
                </Link>
                <Link to="/settings" onClick={() => setShowMenu(false)}
                  className="block px-4 py-2.5 hover:bg-mainBg text-sm font-medium text-gray-600 transition-all duration-200">
                  Settings
                </Link>
                <Link to="/find-people" onClick={() => setShowMenu(false)}
                  className="block px-4 py-2.5 hover:bg-mainBg text-sm font-medium text-gray-600 transition-all duration-200">
                  Find People
                </Link>
                <hr className="border-softIvory/30" />
                <button
                  onClick={() => { setShowMenu(false); logout(); navigate('/login'); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-sm font-semibold text-primaryPink transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
