import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services';
import toast from 'react-hot-toast';

/**
 * AuthCallback — handles the redirect from Google OAuth.
 *
 * Flow:
 *   1. User clicks "Continue with Google" on /login
 *   2. Frontend redirects to backend: /api/auth/google
 *   3. Passport redirects to Google consent screen
 *   4. Google redirects to backend callback: /api/auth/google/callback
 *   5. Backend generates JWT, redirects to: /auth/callback?token=<jwt>
 *   6. THIS COMPONENT handles that redirect:
 *      a. Reads token from URL
 *      b. Calls GET /api/auth/me with that token
 *      c. Stores token + user in localStorage + AuthContext
 *      d. Navigates to /feed
 *
 * Why loginWithUserData() instead of updateUser():
 *   updateUser() does a shallow merge with the existing user state.
 *   After a fresh OAuth login there is no existing user in context,
 *   so the merge produces nothing and isAuthenticated stays false,
 *   causing /feed to immediately redirect back to /login.
 *   loginWithUserData() sets the user from scratch — correct behavior.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithUserData } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    // Google OAuth failed server-side (bad client ID, consent denied, etc.)
    if (error) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    // No token in URL — shouldn't happen but handle gracefully
    if (!token) {
      toast.error('Authentication error. No token received.');
      navigate('/login', { replace: true });
      return;
    }

    // Store token first so the getMe() request includes it in the
    // Authorization header (the axios interceptor reads from localStorage)
    localStorage.setItem('token', token);

    authService
      .getMe()
      .then((res) => {
        const userData = res.data.user;
        // Atomically set user + token in context and localStorage
        loginWithUserData(userData, token);
        toast.success(`Welcome, ${userData.fullname}! 🎉`);
        navigate('/feed', { replace: true });
      })
      .catch(() => {
        // Token was invalid or expired — clean up and prompt re-login
        localStorage.removeItem('token');
        toast.error('Authentication failed. Please sign in again.');
        navigate('/login', { replace: true });
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-mainBg">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primaryPink/30 border-t-primaryPink rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-semibold">Signing you in with Google...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait a moment</p>
      </div>
    </div>
  );
}
