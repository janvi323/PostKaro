import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiSearch, HiPlus, HiBell, HiChat, HiX } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { feedService, userService } from '../services';

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function resolveUrl(url) {
  if (!url) return `${API_BASE}/images/default-avatar.svg`;
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
    <nav className="sticky top-0 z-50 glass border-b border-white/30">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/feed" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-strongPink rounded-xl flex items-center justify-center shadow-md
                          group-hover:scale-110 transition-transform duration-300">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-xl font-bold text-gray-800 hidden sm:block">
            Post<span className="text-strongPink">Karo</span>
          </span>
        </Link>

        {/* Search */}
        <div className="relative flex-1 max-w-md mx-4" ref={searchRef}>
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search people..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (results.length > 0) setShowSearch(true); }}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-pink-50 border border-pink-100
                         focus:bg-white focus:border-strongPink focus:ring-2 focus:ring-strongPink/20
                         transition-all duration-300 text-sm placeholder-gray-400 outline-none"
            />
            {search && (
              <button onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-pink-100 rounded-full transition-colors">
                <HiX className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {showSearch && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-pink-100
                            overflow-hidden z-50 animate-slide-down max-h-80 overflow-y-auto">
              {searchLoading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <div className="w-5 h-5 border-2 border-strongPink/30 border-t-strongPink rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">Searching...</span>
                </div>
              ) : results.length > 0 ? (
                results.map((u, i) => (
                  <button
                    key={u._id}
                    onClick={() => selectUser(u)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors
                               ${i === activeIndex ? 'bg-softPink/30' : 'hover:bg-pink-50'}`}
                  >
                    <img
                      src={resolveUrl(u.dp)}
                      alt={u.username}
                      className="w-9 h-9 rounded-full object-cover border-2 border-pink-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{u.fullname}</p>
                      <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                    </div>
                    <span className="text-xs text-gray-300 font-medium">
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
        <div className="flex items-center gap-2">
          <button
            onClick={onCreatePost}
            className="hidden sm:flex items-center gap-2 bg-strongPink text-white px-4 py-2 rounded-2xl
                       font-semibold text-sm hover:bg-pink-500 transition-all duration-300 shadow-md hover:shadow-xl
                       active:scale-95"
          >
            <HiPlus className="w-4 h-4" />
            Create
          </button>

          {/* Mobile create */}
          <button
            onClick={onCreatePost}
            className="sm:hidden p-2 bg-strongPink text-white rounded-xl shadow-md hover:bg-pink-500 transition-all"
          >
            <HiPlus className="w-5 h-5" />
          </button>

          <Link to="/conversations" className="relative p-2 hover:bg-pink-50 rounded-xl transition-colors">
            <HiChat className="w-5 h-5 text-gray-600" />
            {counts.messages > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-strongPink text-white text-xs
                               rounded-full flex items-center justify-center font-bold">
                {counts.messages > 9 ? '9+' : counts.messages}
              </span>
            )}
          </Link>

          <Link to="/notifications" className="relative p-2 hover:bg-pink-50 rounded-xl transition-colors">
            <HiBell className="w-5 h-5 text-gray-600" />
            {counts.notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primaryGreen text-white text-xs
                               rounded-full flex items-center justify-center font-bold">
                {counts.notifications > 9 ? '9+' : counts.notifications}
              </span>
            )}
          </Link>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu((p) => !p)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-pink-50 transition-colors"
            >
              <img
                src={dpUrl}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover border-2 border-pink-200"
              />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-100 overflow-hidden z-50 animate-slide-down">
                <Link to={`/profile/${user?._id}`} onClick={() => setShowMenu(false)}
                  className="block px-4 py-3 hover:bg-pink-50 text-sm font-medium text-gray-700 transition-colors">
                  My Profile
                </Link>
                <Link to="/dashboard" onClick={() => setShowMenu(false)}
                  className="block px-4 py-3 hover:bg-pink-50 text-sm font-medium text-gray-700 transition-colors">
                  Dashboard
                </Link>
                <Link to="/settings" onClick={() => setShowMenu(false)}
                  className="block px-4 py-3 hover:bg-pink-50 text-sm font-medium text-gray-700 transition-colors">
                  Settings
                </Link>
                <Link to="/find-people" onClick={() => setShowMenu(false)}
                  className="block px-4 py-3 hover:bg-pink-50 text-sm font-medium text-gray-700 transition-colors">
                  Find People
                </Link>
                <hr className="border-pink-100" />
                <button
                  onClick={() => { setShowMenu(false); logout(); navigate('/login'); }}
                  className="w-full text-left px-4 py-3 hover:bg-pink-50 text-sm font-medium text-strongPink transition-colors"
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
