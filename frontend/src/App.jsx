import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';
import CreatePostModal from './components/CreatePostModal';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Feed = lazy(() => import('./pages/Feed'));
const Explore = lazy(() => import('./pages/Explore'));
const Profile = lazy(() => import('./pages/Profile'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Conversations = lazy(() => import('./pages/Conversations'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const FindPeople = lazy(() => import('./pages/FindPeople'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-softPink border-t-strongPink rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [showCreatePost, setShowCreatePost] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mainBg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-softPink border-t-strongPink rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading PostKaro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mainBg bg-pattern">
      {isAuthenticated && <Navbar onCreatePost={() => setShowCreatePost(true)} />}

      <main className={isAuthenticated ? 'pt-2' : ''}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/feed" />} />
            <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/feed" />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/feed" />} />
            <Route path="/reset-password/:token" element={!isAuthenticated ? <ResetPassword /> : <Navigate to="/feed" />} />

            {/* Protected */}
            <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/conversations" element={<ProtectedRoute><Conversations /></ProtectedRoute>} />
            <Route path="/chat/:userId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/find-people" element={<ProtectedRoute><FindPeople /></ProtectedRoute>} />

            {/* Catch-all */}            <Route path="/" element={<Navigate to={isAuthenticated ? '/feed' : '/login'} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>

      {isAuthenticated && <ChatWidget />}
      {isAuthenticated && showCreatePost && (
        <CreatePostModal onClose={() => setShowCreatePost(false)} />
      )}
    </div>
  );
}
