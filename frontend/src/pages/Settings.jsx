import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services';
import toast from 'react-hot-toast';
import { FiCamera, FiSave, FiTrash2 } from 'react-icons/fi';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    fullname: '',
    bio: '',
    website: '',
    isPrivate: false,
  });
  const [dpPreview, setDpPreview] = useState(null);
  const [dpFile, setDpFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        fullname: user.fullname || '',
        bio: user.bio || '',
        website: user.website || '',
        isPrivate: user.isPrivate || false,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleDp = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDpFile(file);
    setDpPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Upload DP if changed
      if (dpFile) {
        const fd = new FormData();
        fd.append('dp', dpFile);
        const dpRes = await profileService.uploadDp(fd);
        updateUser({ dp: dpRes.data.dp });
      }
      // Update settings
      const res = await profileService.updateSettings(form);
      updateUser(res.data.user || form);
      toast.success('Settings updated!');
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const deleteDp = async () => {
    try {
      await profileService.deleteDp();
      updateUser({ dp: '' });
      setDpPreview(null);
      setDpFile(null);
      toast.success('Profile picture removed');
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Profile Picture */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            <img
              src={dpPreview || user?.dp || '/images/dp/default-avatar.svg'}
              className="w-24 h-24 rounded-full object-cover border-4 border-softPink"
              alt="Profile"
            />
            <label
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full
                         opacity-0 group-hover:opacity-100 transition cursor-pointer"
            >
              <FiCamera className="text-white text-xl" />
              <input type="file" accept="image/*" onChange={handleDp} className="hidden" />
            </label>
          </div>
          <div>
            <p className="font-semibold">{user?.username}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
            {user?.dp && (
              <button type="button" onClick={deleteDp}
                className="text-xs text-red-400 mt-1 flex items-center gap-1 hover:underline">
                <FiTrash2 /> Remove photo
              </button>
            )}
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
          <input name="fullname" value={form.fullname} onChange={handleChange}
            className="input-field" placeholder="Your full name" />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Bio</label>
          <textarea name="bio" value={form.bio} onChange={handleChange} rows={3}
            className="input-field resize-none" placeholder="Tell us about yourself..." />
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Website</label>
          <input name="website" value={form.website} onChange={handleChange}
            className="input-field" placeholder="https://yoursite.com" />
        </div>

        {/* Privacy */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-sm">Private Account</p>
            <p className="text-xs text-gray-400">Only approved followers can see your posts</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" name="isPrivate" checked={form.isPrivate}
              onChange={handleChange} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primaryGreen/50
                            rounded-full peer peer-checked:bg-primaryGreen transition
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                            after:bg-white after:rounded-full after:h-5 after:w-5 after:transition
                            peer-checked:after:translate-x-full" />
          </label>
        </div>

        {/* Submit */}
        <button type="submit" disabled={saving}
          className="btn-green w-full flex items-center justify-center gap-2">
          <FiSave />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
