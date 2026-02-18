import { useState } from 'react';
import { HiHeart, HiExternalLink } from 'react-icons/hi';

/**
 * UnsplashCard — a card component for Unsplash photos that matches
 * the PostCard visual style in the masonry grid.
 */
export default function UnsplashCard({ photo }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [liked, setLiked] = useState(false);

  if (!photo) return null;

  return (
    <div className="masonry-item">
      <div className="card overflow-hidden group">
        {/* Image */}
        <div className="relative overflow-hidden rounded-t-2xl">
          {!imgLoaded && !imgError && (
            <div className="w-full skeleton" style={{ paddingBottom: '75%' }} />
          )}
          <img
            src={photo.urls?.small}
            alt={photo.alt_description || 'Unsplash photo'}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={`w-full object-cover group-hover:scale-105 transition-transform duration-500
                        ${imgLoaded ? 'block' : 'hidden'}`}
          />
          {imgError && (
            <div className="w-full flex items-center justify-center bg-pink-50 py-16">
              <span className="text-gray-400 text-sm">Failed to load image</span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent
                          opacity-0 group-hover:opacity-100 transition-all duration-300
                          flex items-end justify-between p-3 pointer-events-none group-hover:pointer-events-auto">
            <button
              onClick={() => setLiked(!liked)}
              className="flex items-center gap-1 text-white"
            >
              <HiHeart className={`w-6 h-6 ${liked ? 'text-strongPink fill-current' : ''} drop-shadow-lg
                                   transition-transform hover:scale-125`} />
              <span className="text-sm font-semibold drop-shadow-lg">{photo.likes || 0}</span>
            </button>
            <a
              href={photo.links?.html || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-white"
            >
              <HiExternalLink className="w-5 h-5 drop-shadow-lg" />
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {photo.user?.profile_image?.small ? (
                <img
                  src={photo.user.profile_image.small}
                  alt={photo.user.name}
                  className="w-7 h-7 rounded-full object-cover border border-pink-100"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-strongPink">
                    {(photo.user?.name || 'U')[0]}
                  </span>
                </div>
              )}
              <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">
                {photo.user?.name || 'Unknown'}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-50 text-strongPink font-semibold">
              Unsplash
            </span>
          </div>

          {photo.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{photo.description}</p>
          )}

          {/* Quick stats */}
          <div className="flex items-center gap-3 pt-2 mt-2 border-t border-pink-50">
            <button onClick={() => setLiked(!liked)} className="flex items-center gap-1 text-xs">
              <HiHeart className={`w-4 h-4 ${liked ? 'text-strongPink' : 'text-gray-400'} transition-colors`} />
              <span className="text-gray-500">{photo.likes || 0}</span>
            </button>
            <a
              href={photo.links?.html || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-strongPink transition-colors"
            >
              <HiExternalLink className="w-4 h-4 text-gray-400" />
              <span>View</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
