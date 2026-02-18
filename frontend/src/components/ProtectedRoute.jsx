import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mainBg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-strongPink/30 border-t-strongPink rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading PostKaro...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
