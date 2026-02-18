import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) return toast.error('All fields required');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');

    try {
      setLoading(true);
      const { data } = await authService.resetPassword(token, password);
      setSuccess(true);
      toast.success(data.message || 'Password reset successful!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
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
          {!success ? (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-softPink/30 to-strongPink/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-strongPink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-700">Reset Password</h2>
                <p className="text-gray-400 mt-2 text-sm">
                  Choose a strong new password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="At least 6 characters"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="Re-enter your password"
                  />
                </div>

                {/* Password strength hint */}
                {password && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          password.length < 6 ? 'w-1/4 bg-red-400' :
                          password.length < 10 ? 'w-2/4 bg-yellow-400' :
                          password.length < 14 ? 'w-3/4 bg-primaryGreen' :
                          'w-full bg-primaryGreen'
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      password.length < 6 ? 'text-red-400' :
                      password.length < 10 ? 'text-yellow-500' :
                      'text-primaryGreen'
                    }`}>
                      {password.length < 6 ? 'Weak' : password.length < 10 ? 'Fair' : password.length < 14 ? 'Strong' : 'Very Strong'}
                    </span>
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Resetting...
                    </span>
                  ) : (
                    'Reset Password'
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
              <h2 className="text-xl font-bold text-gray-700 mb-2">Password Reset!</h2>
              <p className="text-gray-400 text-sm mb-4">
                Your password has been changed successfully. Redirecting to login...
              </p>
              <div className="w-6 h-6 border-3 border-softPink border-t-strongPink rounded-full animate-spin mx-auto" />
            </div>
          )}

          <p className="text-center text-sm text-gray-400 mt-6">
            <Link to="/login" className="text-strongPink font-semibold hover:underline">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
