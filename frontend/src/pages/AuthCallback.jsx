import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Google login failed');
      navigate('/login');
      return;
    }

    if (token) {
      localStorage.setItem('token', token);
      authService
        .getMe()
        .then((res) => {
          localStorage.setItem('user', JSON.stringify(res.data.user));
          updateUser(res.data.user);
          toast.success(`Welcome, ${res.data.user.fullname}!`);
          navigate('/feed');
        })
        .catch(() => {
          toast.error('Authentication failed');
          navigate('/login');
        });
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-mainBg">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-strongPink/30 border-t-strongPink rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Authenticating...</p>
      </div>
    </div>
  );
}
