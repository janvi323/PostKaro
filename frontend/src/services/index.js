import api from './api';

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  googleLogin: () => {
    window.location.href = `${import.meta.env.VITE_API_URL || '/api'}/auth/google`;
  },
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

export const feedService = {
  getFeed: (page = 1, limit = 24) => api.get(`/feed/feed?page=${page}&limit=${limit}`),
  getExplore: (page = 1, limit = 24) => api.get(`/feed/explore?page=${page}&limit=${limit}`),
  getDashboard: () => api.get('/feed/dashboard'),
  searchUsers: (q) => api.get(`/feed/search-users?q=${q}`),
  getNotificationCounts: () => api.get('/feed/notification-counts'),
  savePost: (id) => api.post(`/feed/post/${id}/save`),
};

export const postService = {
  getPost: (id) => api.get(`/posts/${id}`),
  createPost: (formData) =>
    api.post('/posts/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePost: (id) => api.delete(`/posts/${id}`),
  editPost: (id, caption) => api.put(`/posts/${id}`, { caption }),
  likePost: (id) => api.post(`/posts/${id}/like`),
  unlikePost: (id) => api.post(`/posts/${id}/unlike`),
  commentPost: (id, text) => api.post(`/posts/${id}/comment`, { text }),
  deleteComment: (postId, commentId) => api.delete(`/posts/${postId}/comment/${commentId}`),
  viewPost: (id, duration) => api.post(`/posts/${id}/view`, { duration }),
  sharePost: (id, platform) => api.post(`/posts/${id}/share`, { platform }),
};

export const profileService = {
  getMyProfile: () => api.get('/profile/me'),
  getProfile: (id) => api.get(`/profile/${id}`),
  updateSettings: (data) => api.put('/profile/settings', data),
  uploadDp: (formData) =>
    api.post('/profile/upload-dp', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteDp: () => api.delete('/profile/delete-dp'),
};

export const followService = {
  follow: (userId) => api.post(`/follow/follow/${userId}`),
  unfollow: (userId) => api.post(`/follow/unfollow/${userId}`),
  acceptRequest: (userId) => api.post(`/follow/accept-request/${userId}`),
  declineRequest: (userId) => api.post(`/follow/decline-request/${userId}`),
  getStatus: (userId) => api.get(`/follow/status/${userId}`),
  getFollowers: (userId) => api.get(`/follow/followers/${userId}`),
  getFollowing: (userId) => api.get(`/follow/following/${userId}`),
  getRequests: () => api.get('/follow/requests'),
  canMessage: (userId) => api.get(`/follow/can-message/${userId}`),
  search: (q) => api.get(`/follow/search?q=${q}`),
};

export const chatService = {
  getChat: (userId) => api.get(`/chat/${userId}`),
  sendMessage: (userId, text) => api.post(`/chat/${userId}/send`, { text }),
  deleteChat: (userId) => api.delete(`/chat/${userId}`),
};

export const conversationService = {
  getAll: () => api.get('/conversations'),
  searchUsers: (q) => api.get(`/conversations/search-users?q=${q}`),
  markAllRead: () => api.post('/conversations/mark-all-read'),
};

export const notificationService = {
  getNotifications: () => api.get('/notifications'),
  acceptRequest: (userId) => api.post(`/notifications/accept-request/${userId}`),
  declineRequest: (userId) => api.post(`/notifications/decline-request/${userId}`),
};

export const userService = {
  search: (query) => api.get(`/users/search?query=${encodeURIComponent(query)}`),
};
