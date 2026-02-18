import { useState, useRef } from 'react';
import { HiX, HiPhotograph, HiFilm, HiSparkles } from 'react-icons/hi';
import { postService } from '../services';
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
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (selected) => {
    if (!selected) return;
    const type = getMediaType(selected);
    if (!type) return toast.error('Only images, GIFs, and videos are supported');
    if (selected.size > 50 * 1024 * 1024) return toast.error('File too large (max 50MB)');

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

  const clearFile = () => {
    if (preview && mediaType === 'video') URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setMediaType(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select an image, GIF, or video');

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption.trim());

      const res = await postService.createPost(formData);
      toast.success('Post created!');
      onCreated?.(res.data.post);
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    clearFile();
    setCaption('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={handleClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in"
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pink-100
                        bg-gradient-to-r from-strongPink/5 to-softPink/10">
          <h2 className="text-lg font-bold text-gray-800">Create Post</h2>
          <button onClick={handleClose}
            className="p-2 hover:bg-pink-50 rounded-xl transition-colors">
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Upload area */}
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden bg-black/5">
              {mediaType === 'video' ? (
                <video src={preview} controls
                  className="w-full max-h-72 object-contain rounded-2xl mx-auto" />
              ) : (
                <img src={preview} alt="Preview"
                  className="w-full max-h-72 object-contain rounded-2xl mx-auto" />
              )}
              <button type="button" onClick={clearFile}
                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full
                           hover:bg-black/70 transition-colors">
                <HiX className="w-4 h-4" />
              </button>
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded-lg font-medium uppercase">
                {mediaType}
              </div>
            </div>
          ) : (
            <button type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`w-full h-52 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center
                         transition-all duration-300 group
                         ${dragActive
                           ? 'border-strongPink bg-strongPink/5 scale-[1.02]'
                           : 'border-pink-200 hover:border-strongPink hover:bg-pink-50/50'}`}>
              <div className="flex items-center gap-3 mb-3">
                <HiPhotograph className="w-8 h-8 text-strongPink/60 group-hover:text-strongPink transition-colors" />
                <HiSparkles className="w-8 h-8 text-primaryGreen/60 group-hover:text-primaryGreen transition-colors" />
                <HiFilm className="w-8 h-8 text-softPink/80 group-hover:text-softPink transition-colors" />
              </div>
              <span className="text-sm font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                {dragActive ? 'Drop your file here' : 'Click or drag to upload'}
              </span>
              <span className="text-xs text-gray-300 mt-1">
                Images, GIFs, Videos (max 50MB)
              </span>
            </button>
          )}
          <input ref={fileRef} type="file" accept={ACCEPT_TYPES} onChange={handleFileChange} className="hidden" />

          {/* Caption (optional) */}
          <div>
            <textarea
              placeholder="Write a caption (optional)..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="input-field resize-none"
            />
            <p className="text-xs text-gray-300 mt-1 text-right">{caption.length}/500</p>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading || !file}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading && (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading ? 'Posting...' : 'Share Post'}
          </button>
        </form>
      </div>
    </div>
  );
}
