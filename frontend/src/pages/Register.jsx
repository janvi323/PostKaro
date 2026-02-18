import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', fullname: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.fullname || !form.password) {
      return toast.error('All fields are required');
    }
    try {
      setLoading(true);
      await register(form);
      navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-mainBg bg-pattern">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-strongPink to-softPink rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-pink animate-float">
            <span className="text-white text-3xl font-bold">P</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-700">
            Post<span className="text-strongPink">Karo</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Join the community</p>
        </div>

        <div className="glass rounded-3xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Create Account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
              <input name="fullname" type="text" value={form.fullname} onChange={handleChange}
                className="input-field" placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
              <input name="username" type="text" value={form.username} onChange={handleChange}
                className="input-field" placeholder="Choose a username" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className="input-field" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange}
                className="input-field" placeholder="Create a password" />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-strongPink font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
