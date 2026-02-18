import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return toast.error('All fields required');
    try {
      setLoading(true);
      await login({ username, password });
      navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-mainBg bg-pattern">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-strongPink to-softPink rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-pink animate-float">
            <span className="text-white text-3xl font-bold">P</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-700">
            Post<span className="text-strongPink">Karo</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Share your world, beautifully.</p>
        </div>

        <div className="glass rounded-3xl p-8">
          <h2 className="text-xl font-bold text-gray-700 mb-6 text-center">Welcome back</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
              />
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-strongPink font-medium hover:underline">
                Forgot Password?
              </Link>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-pink-100" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-pink-100" />
          </div>

          {/* Google OAuth */}
          <button
            onClick={() => authService.googleLogin()}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700
                       px-6 py-2.5 rounded-2xl font-semibold hover:bg-gray-50 hover:shadow-md
                       transition-all duration-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-strongPink font-semibold hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
