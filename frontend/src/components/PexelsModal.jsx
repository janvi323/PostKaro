/**
 * PexelsModal.jsx
 *
 * Search and browse Pexels photos/videos to attach to a new post.
 *
 * Architecture:
 *  - All API calls go through the backend proxy at /api/pexels/…
 *  - The Pexels API key is NEVER present in frontend code
 *  - Debounced search (400 ms) to avoid hammering the proxy
 *  - Tabs: Photos | Videos
 *  - Pinterest-style masonry grid
 *  - Clicking an item calls onSelect({ url, mediaType, attribution })
 *
 * Props:
 *  - onSelect(media)  Called with the selected media object
 *  - onClose()        Called when the modal is dismissed
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { HiX, HiSearch, HiPhotograph, HiFilm, HiCheckCircle, HiPlay } from 'react-icons/hi';
import { pexelsService } from '../services';

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Single photo card */
function PhotoCard({ photo, isSelected, onSelect }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(photo)}
      className={`relative w-full overflow-hidden rounded-xl group transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primaryPink
                  ${isSelected ? 'ring-4 ring-primaryPink scale-[0.97]' : 'hover:scale-[1.02] hover:shadow-lg'}`}
      title={photo.alt || photo.photographer}
    >
      {/* Skeleton — always renders behind the image so lazy-load can fire.
           NEVER collapse the img to h-0 or display:none or it won't load. */}
      {!loaded && (
        <div
          className="absolute inset-0 skeleton rounded-xl"
          style={{ paddingBottom: `${Math.round((photo.height / photo.width) * 100)}%` }}
        />
      )}
      <img
        src={photo.src.large || photo.src.medium}
        alt={photo.alt || 'Pexels photo'}
        loading="lazy"
        className={`w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ minHeight: loaded ? 'auto' : `${Math.round((photo.height / photo.width) * 100)}px` }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)} /* even on error, stop showing skeleton */
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 rounded-xl" />
      {/* Photographer credit */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 via-transparent
                      translate-y-full group-hover:translate-y-0 transition-transform duration-200 rounded-b-xl">
        <p className="text-white text-xs font-medium truncate">📷 {photo.photographer}</p>
      </div>
      {/* Selected badge */}
      {isSelected && (
        <div className="absolute top-2 right-2 text-primaryPink drop-shadow-lg">
          <HiCheckCircle className="w-7 h-7" />
        </div>
      )}
    </button>
  );
}

/** Single video card */
function VideoCard({ video, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(video)}
      className={`relative w-full overflow-hidden rounded-xl group transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primaryPink
                  ${isSelected ? 'ring-4 ring-primaryPink scale-[0.97]' : 'hover:scale-[1.02] hover:shadow-lg'}`}
      title={video.user?.name}
    >
      <img
        src={video.image}
        alt="Video thumbnail"
        loading="lazy"
        className="w-full object-cover"
      />
      {/* Overlay with play icon */}
      <div className={`absolute inset-0 flex items-center justify-center rounded-xl
                       bg-black/20 group-hover:bg-black/40 transition-all duration-200`}>
        <div className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center
                        group-hover:scale-110 transition-transform duration-200">
          <HiPlay className="w-6 h-6 text-gray-800 ml-0.5" />
        </div>
      </div>
      {/* Duration badge */}
      {video.duration && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-lg font-medium">
          {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
        </div>
      )}
      {/* Author */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 via-transparent
                      translate-y-full group-hover:translate-y-0 transition-transform duration-200 rounded-b-xl">
        <p className="text-white text-xs font-medium truncate">🎬 {video.user?.name}</p>
      </div>
      {/* Selected badge */}
      {isSelected && (
        <div className="absolute top-2 right-2 text-primaryPink drop-shadow-lg">
          <HiCheckCircle className="w-7 h-7" />
        </div>
      )}
    </button>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

export default function PexelsModal({ onClose, onSelect }) {
  const [tab, setTab] = useState('photos'); // 'photos' | 'videos'
  const [query, setQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const debounceRef = useRef(null);
  const sentinelRef = useRef(null);

  // ── Fetch media ──────────────────────────────────────────────────────────────
  const fetchMedia = useCallback(async (searchQuery, pageNum, tabName, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      if (tabName === 'photos') {
        const res = await pexelsService.getPhotos(searchQuery, pageNum, 20);
        const newItems = res.data.photos || [];
        setPhotos((prev) => (append ? [...prev, ...newItems] : newItems));
        setHasMore(res.data.meta?.hasNextPage ?? newItems.length === 20);
      } else {
        const res = await pexelsService.getVideos(searchQuery, pageNum, 15);
        const newItems = res.data.videos || [];
        setVideos((prev) => (append ? [...prev, ...newItems] : newItems));
        setHasMore(res.data.meta?.hasNextPage ?? newItems.length === 15);
      }
    } catch (err) {
      console.error('[PexelsModal] Fetch error:', err);
      setError(
        err.response?.data?.message ||
          'Failed to load media. The Pexels API key may not be configured on the server.'
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // ── Initial load & tab change ────────────────────────────────────────────────
  useEffect(() => {
    setPage(1);
    setSelectedId(null);
    fetchMedia(query, 1, tab, false);
  }, [tab, query, fetchMedia]);

  // ── Debounced search input ───────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(val.trim());
    }, 400);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery(inputValue.trim());
  };

  // ── Infinite scroll sentinel ─────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchMedia(query, nextPage, tab, true);
        }
      },
      { rootMargin: '300px' }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, page, query, tab, fetchMedia]);

  // ── Handle selection ─────────────────────────────────────────────────────────
  const handleSelect = (item) => {
    const id = item.id;
    setSelectedId((prev) => (prev === id ? null : id)); // toggle
  };

  const handleConfirm = () => {
    if (!selectedId) return;

    if (tab === 'photos') {
      const photo = photos.find((p) => p.id === selectedId);
      if (!photo) return;
      onSelect({
        url: photo.src.large2x || photo.src.large || photo.src.original,
        mediaType: 'image',
        previewUrl: photo.src.large,
        attribution: {
          photographer: photo.photographer,
          photographerUrl: photo.photographerUrl,
          source: 'Pexels',
          sourceUrl: photo.url,
        },
      });
    } else {
      const video = videos.find((v) => v.id === selectedId);
      if (!video) return;
      onSelect({
        url: video.videoFile,
        mediaType: 'video',
        previewUrl: video.image,
        attribution: {
          author: video.user?.name,
          authorUrl: video.user?.url,
          source: 'Pexels',
          sourceUrl: video.url,
        },
      });
    }
  };

  const currentItems = tab === 'photos' ? photos : videos;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pink-100 flex-shrink-0
                        bg-gradient-to-r from-primaryPink/5 to-softIvory/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primaryPink/10 rounded-xl flex items-center justify-center">
              <HiPhotograph className="w-5 h-5 text-primaryPink" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Browse Pexels</h2>
              <p className="text-xs text-gray-400">Free stock photos & videos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-pink-50 rounded-xl transition-colors"
          >
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Search + Tabs ── */}
        <div className="px-6 py-4 flex-shrink-0 space-y-3 border-b border-gray-100">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Search photos & videos…"
                className="input-field pl-10 pr-4 w-full"
              />
            </div>
            <button type="submit" className="btn-primary px-5">Search</button>
          </form>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              type="button"
              onClick={() => setTab('photos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                          ${tab === 'photos'
                            ? 'bg-white text-primaryPink shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'}`}
            >
              <HiPhotograph className="w-4 h-4" />
              Photos
            </button>
            <button
              type="button"
              onClick={() => setTab('videos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                          ${tab === 'videos'
                            ? 'bg-white text-primaryPink shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'}`}
            >
              <HiFilm className="w-4 h-4" />
              Videos
            </button>
          </div>
        </div>

        {/* ── Media Grid ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Loading skeleton */}
          {loading && (
            <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton rounded-xl w-full break-inside-avoid"
                  style={{ height: `${100 + (i % 3) * 60}px` }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">⚠️</p>
              <p className="text-gray-600 font-medium">{error}</p>
              <button
                onClick={() => fetchMedia(query, 1, tab, false)}
                className="mt-4 btn-primary"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && currentItems.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-gray-500">No results. Try a different search term.</p>
            </div>
          )}

          {/* Grid — Pinterest-style masonry using CSS columns */}
          {!loading && !error && currentItems.length > 0 && (
            <>
              <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
                {tab === 'photos'
                  ? photos.map((photo) => (
                      <div key={photo.id} className="break-inside-avoid mb-3">
                        <PhotoCard
                          photo={photo}
                          isSelected={selectedId === photo.id}
                          onSelect={handleSelect}
                        />
                      </div>
                    ))
                  : videos.map((video) => (
                      <div key={video.id} className="break-inside-avoid mb-3">
                        <VideoCard
                          video={video}
                          isSelected={selectedId === video.id}
                          onSelect={handleSelect}
                        />
                      </div>
                    ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-4" />

              {loadingMore && (
                <div className="flex justify-center py-6">
                  <div className="w-7 h-7 border-[3px] border-primaryPink/30 border-t-primaryPink rounded-full animate-spin" />
                </div>
              )}

              {!hasMore && (
                <p className="text-center text-xs text-gray-400 py-4">No more results</p>
              )}
            </>
          )}
        </div>

        {/* ── Footer / Confirm ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0
                        bg-gradient-to-r from-softIvory/10 to-white">
          <p className="text-xs text-gray-400">
            Photos &amp; Videos by{' '}
            <a
              href="https://www.pexels.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primaryPink hover:underline font-medium"
            >
              Pexels
            </a>
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100
                         hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedId}
              className="btn-primary px-6 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <HiCheckCircle className="w-4 h-4" />
              Use this {tab === 'photos' ? 'photo' : 'video'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
