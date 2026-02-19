/**
 * PexelsCard.jsx
 *
 * Feed card for Pexels photos / videos (not user-created posts).
 * Displayed inline in the masonry grid alongside PostCard and UnsplashCard.
 *
 * Visual style mirrors UnsplashCard intentionally so the feed feels cohesive.
 *
 * Props:
 *  item           – normalised Pexels object:
 *                   Photos  → { id, src, photographer, photographerUrl, alt, url, width, height }
 *                   Videos  → { id, image, videoFile, user, url, duration }
 *  mediaType      – 'photo' | 'video'
 *  onBrokenImage  – called when media fails to load (Feed removes card from combined)
 */

import { useState, useRef } from 'react';
import { HiExternalLink, HiPlay, HiVolumeOff, HiVolumeUp } from 'react-icons/hi';

export default function PexelsCard({ item, mediaType = 'photo', onBrokenImage }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted]   = useState(true);
  const videoRef = useRef(null);

  if (!item) return null;

  const isVideo = mediaType === 'video';

  // ── Error placeholder ────────────────────────────────────────────────────────
  if (imgError) {
    return (
      <div className="masonry-item">
        <div
          className="card overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-gray-100
                     flex flex-col items-center justify-center"
          style={{ minHeight: '160px' }}
        >
          <span className="text-4xl mb-2 opacity-30">🖼️</span>
          <p className="text-xs text-gray-400 font-medium">Media unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="masonry-item">
      <div className="card overflow-hidden group cursor-pointer">

        {/* ── Media ─────────────────────────────────────────────────────────── */}
        {isVideo ? (
          /* Video card */
          <div className="relative w-full overflow-hidden rounded-t-2xl bg-black">
            <video
              ref={videoRef}
              src={item.videoFile}
              poster={item.image}
              className="w-full object-cover"
              loop
              muted={muted}
              playsInline
              preload="metadata"
              onError={() => { setImgError(true); onBrokenImage?.(); }}
            />

            {/* Play/pause overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={() => {
                if (!videoRef.current) return;
                if (playing) { videoRef.current.pause(); setPlaying(false); }
                else         { videoRef.current.play();  setPlaying(true);  }
              }}
            >
              {!playing && (
                <div className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full
                                flex items-center justify-center hover:bg-black/70
                                transition-all duration-300 hover:scale-110">
                  <HiPlay className="w-6 h-6 text-white ml-0.5" />
                </div>
              )}
            </div>

            {/* Duration badge */}
            {item.duration && (
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs
                              rounded-lg font-medium z-10">
                {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
              </div>
            )}

            {/* Mute toggle — only visible while playing */}
            {playing && (
              <button
                onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                className="absolute bottom-2 right-2 p-1.5 bg-black/50 text-white rounded-full
                           hover:bg-black/70 transition-all duration-200 z-10"
              >
                {muted
                  ? <HiVolumeOff className="w-4 h-4" />
                  : <HiVolumeUp  className="w-4 h-4" />}
              </button>
            )}

            {/* Pexels badge */}
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 text-white text-[10px]
                            rounded-lg font-bold tracking-wide z-10">
              PEXELS
            </div>
          </div>
        ) : (
          /* Photo card */
          <div
            className="relative overflow-hidden rounded-t-2xl"
            style={{ minHeight: imgLoaded ? 'auto' : `${Math.round((item.height / item.width) * 100 * 3)}px` }}
          >
            {/* Skeleton */}
            {!imgLoaded && (
              <div className="absolute inset-0 skeleton" />
            )}
            <img
              src={item.src?.large || item.src?.medium || item.src?.small}
              alt={item.alt || 'Pexels photo'}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgError(true); onBrokenImage?.(); }}
              className={`w-full object-cover group-hover:scale-105 transition-all duration-500
                          ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent
                            opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />

            {/* Pexels badge */}
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 text-white text-[10px]
                            rounded-lg font-bold tracking-wide opacity-0 group-hover:opacity-100
                            transition-opacity duration-200">
              PEXELS
            </div>
          </div>
        )}

        {/* ── Card body ─────────────────────────────────────────────────────── */}
        <div className="p-3">
          {/* Author row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {/* Initials avatar */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primaryPink/30 to-secondaryPink/20
                              flex items-center justify-center flex-shrink-0 border border-softIvory">
                <span className="text-xs font-bold text-primaryPink">
                  {(isVideo ? item.user?.name : item.photographer || 'P')[0].toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-600 truncate">
                {isVideo ? item.user?.name : item.photographer}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Open on Pexels */}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 hover:bg-mainBg rounded-lg transition-all duration-200
                           text-gray-400 hover:text-gray-600"
                title="View on Pexels"
              >
                <HiExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-mainBg text-primaryPink font-semibold">
                Pexels
              </span>
            </div>
          </div>

          {/* Alt text / caption */}
          {!isVideo && item.alt && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-2 leading-relaxed">{item.alt}</p>
          )}
        </div>
      </div>
    </div>
  );
}
