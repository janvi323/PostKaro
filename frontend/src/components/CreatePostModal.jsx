/**
 * CreatePostModal.jsx
 *
 * Supports two media sources:
 *  1. Local file upload (image / gif / video)
 *  2. Pexels browse — opens PexelsModal; on selection stores the external URL
 *     and posts via POST /api/posts/from-url (key stays server-side).
 *
 * On success, calls onCreated(newPost) which App.jsx uses to dispatch
 * the "postkaro:postCreated" event so Feed.jsx auto-prepends the new post.
 */
import { useState, useRef } from 'react';
import { HiX, HiPhotograph, HiFilm, HiSparkles } from 'react-icons/hi';
import { postService } from '../services';
import PexelsModal from './PexelsModal';
import toast from 'react-hot-toast';

const ACCEPT_TYPES = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime';

function getMediaType(file) {
  if (!file) return null;
  const mime = file.type.toLowerCase();
  if (mime === 'image/gif') return 'gif';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

export default function CreatePostModal({ onClose, onCreated }) {
  const [caption, setCaption] = useState('');

  // ── Local file state ────────────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' | 'gif' | 'video'

  // ── Pexels state ────────────────────────────────────────────────────────────
  const [showPexels, setShowPexels] = useState(false);
  const [pexelsMedia, setPexelsMedia] = useState(null); // { url, mediaType, previewUrl, attribution }

  // ── Shared ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const hasMedia = !!file || !!pexelsMedia;
  // Displayed preview: prefer pexels preview, then local
  const displayPreview = pexelsMedia?.previewUrl || preview;
  const displayMediaType = pexelsMedia?.mediaType || mediaType;

  // ── Local file handlers ──────────────────────────────────────────────────────
  const handleFile = (selected) => {
    if (!selected) return;
    const type = getMediaType(selected);
    if (!type) return toast.error('Only images, GIFs, and videos are supported');
    if (selected.size > 50 * 1024 * 1024) return toast.error('File too large (max 50MB)');

    // Reset any Pexels selection when a local file is picked
    setPexelsMedia(null);
    setFile(selected);
    setMediaType(type);

    if (type === 'video') {
      setPreview(URL.createObjectURL(selected));
    } else {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(selected);
    }
  };

  const handleFileChange = (e) => handleFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const clearMedia = () => {
    if (preview && (mediaType === 'video')) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setMediaType(null);
    setPexelsMedia(null);
  };

  // ── Pexels selection ─────────────────────────────────────────────────────────
  const handlePexelsSelect = (media) => {
    setPexelsMedia(media);
    setFile(null);
    if (preview && mediaType === 'video') URL.revokeObjectURL(preview);
    setPreview(null);
    setMediaType(null);
    setShowPexels(false);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasMedia) return toast.error('Please select an image, GIF, or video');

    try {
      setLoading(true);
      let res;

      if (pexelsMedia) {
        // External URL post — no file upload needed
        res = await postService.createFromUrl({
          fileUrl: pexelsMedia.url,
          fileType: pexelsMedia.mediaType,
          caption: caption.trim(),
          source: pexelsMedia.attribution?.source?.toLowerCase() || 'pexels',
        });
      } else {
        // Local file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('caption', caption.trim());
        res = await postService.createPost(formData);
      }

      toast.success('Post created!');
      onCreated?.(res.data.post); // triggers App.jsx → postkaro:postCreated event
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    clearMedia();
    setCaption('');
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-pink-100
                          bg-gradient-to-r from-primaryPink/5 to-softIvory/20">
            <h2 className="text-lg font-bold text-gray-800">Create Post</h2>
            <button onClick={handleClose} className="p-2 hover:bg-pink-50 rounded-xl transition-colors">
              <HiX className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* ── Media Preview ── */}
            {displayPreview ? (
              <div className="relative rounded-2xl overflow-hidden bg-black/5">
                {displayMediaType === 'video' ? (
                  <video
                    src={displayPreview}
                    controls
                    className="w-full max-h-72 object-contain rounded-2xl mx-auto"
                  />
                ) : (
                  <img
                    src={displayPreview}
                    alt="Preview"
                    className="w-full max-h-72 object-contain rounded-2xl mx-auto"
                  />
                )}
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full
                             hover:bg-black/70 transition-colors"
                >
                  <HiX className="w-4 h-4" />
                </button>
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded-lg font-medium uppercase">
                  {pexelsMedia ? `pexels ${displayMediaType}` : displayMediaType}
                </div>
                {/* Pexels attribution tag */}
                {pexelsMedia?.attribution && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded-lg">
                    📷 {pexelsMedia.attribution.photographer || pexelsMedia.attribution.author} · Pexels
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Local upload drop-zone */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`w-full h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center
                               transition-all duration-300 group
                               ${dragActive
                                 ? 'border-primaryPink bg-primaryPink/5 scale-[1.02]'
                                 : 'border-softIvory/60 hover:border-primaryPink hover:bg-mainBg/50'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <HiPhotograph className="w-7 h-7 text-primaryPink/60 group-hover:text-primaryPink transition-colors" />
                    <HiSparkles className="w-7 h-7 text-brandGreen/60 group-hover:text-brandGreen transition-colors" />
                    <HiFilm className="w-7 h-7 text-secondaryPink/80 group-hover:text-secondaryPink transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                    {dragActive ? 'Drop your file here' : 'Click or drag to upload'}
                  </span>
                  <span className="text-xs text-gray-300 mt-1">Images, GIFs, Videos (max 50MB)</span>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">or browse free stock media</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Pexels browse button */}
                <button
                  type="button"
                  onClick={() => setShowPexels(true)}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl
                             border-2 border-dashed border-pink-200 hover:border-primaryPink
                             bg-pink-50/30 hover:bg-pink-50 transition-all duration-200 group"
                >
                  <img
                    src="https://images.pexels.com/lib/api/pexels.png"
                    alt="Pexels"
                    className="h-5 opacity-70 group-hover:opacity-100 transition-opacity"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="text-sm font-semibold text-pink-500 group-hover:text-primaryPink transition-colors">
                    Browse Pexels Photos &amp; Videos
                  </span>
                </button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Caption */}
            <div>
              <textarea
                placeholder="Write a caption (optional)..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                maxLength={500}
                className="input-field resize-none"
              />
              <p className="text-xs text-gray-300 mt-1 text-right">{caption.length}/500</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !hasMedia}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? 'Posting...' : 'Share Post'}
            </button>
          </form>
        </div>
      </div>

      {/* Pexels Modal — rendered outside the CreatePost backdrop to get correct z-index */}
      {showPexels && (
        <PexelsModal
          onClose={() => setShowPexels(false)}
          onSelect={handlePexelsSelect}
        />
      )}
    </>
  );
}

