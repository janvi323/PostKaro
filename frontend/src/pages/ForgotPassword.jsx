import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    try {
      setLoading(true);
      const { data } = await authService.forgotPassword(email);
      setSent(true);
      toast.success(data.message || 'Reset link sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
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
        </div>

        <div className="glass rounded-3xl p-8">
          {!sent ? (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-softPink/30 to-strongPink/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-strongPink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-700">Forgot Password?</h2>
                <p className="text-gray-400 mt-2 text-sm">
                  No worries! Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="Enter your email"
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primaryGreen/20 to-lightGreen/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primaryGreen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">Check Your Email</h2>
              <p className="text-gray-400 text-sm mb-6">
                We've sent a password reset link to <strong className="text-gray-600">{email}</strong>.
                The link will expire in 1 hour.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="text-strongPink font-semibold text-sm hover:underline"
              >
                Didn't receive it? Try again
              </button>
            </div>
          )}

          <p className="text-center text-sm text-gray-400 mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-strongPink font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
