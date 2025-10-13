import React, { useState, useEffect } from 'react'
import { 
  Camera, 
  Upload, 
  X, 
  Search, 
  Bell, 
  MessageCircle, 
  Filter, 
  Menu, 
  Edit3, 
  Trash2, 
  MoreHorizontal,
  Plus,
  Heart,
  MessageSquare,
  Share2,
  Save,
  User,
  Settings
} from 'lucide-react'

interface Post {
  id: string
  title: string
  description: string
  imageUrl: string
  fileType: 'image' | 'video'
  likes: number
  comments: number
  saves: number
  createdAt: string
  user: {
    id: string
    username: string
    avatar: string
  }
}

interface UserProfile {
  id: string
  username: string
  fullname: string
  email: string
  avatar: string
  postsCount: number
  savedPostsCount: number
  createdAt: string
}

interface NewPost {
  title: string
  description: string
  file: File | null
  imageUrl: string
}

export function PinterestProfile(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'created' | 'saved'>('created')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showEditPostModal, setShowEditPostModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState<NewPost>({ 
    title: '', 
    description: '', 
    file: null,
    imageUrl: ''
  })
  const [editPost, setEditPost] = useState<NewPost>({ 
    title: '', 
    description: '', 
    file: null,
    imageUrl: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/user/profile')
      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
    }
  }

  // Fetch user posts
  const fetchUserPosts = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:4000/api/posts/my-posts')
      if (response.ok) {
        const posts = await response.json()
        setUserPosts(posts)
      }
    } catch (err) {
      console.error('Error fetching posts:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch saved posts
  const fetchSavedPosts = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/posts/my-saved')
      if (response.ok) {
        const posts = await response.json()
        setSavedPosts(posts)
      }
    } catch (err) {
      console.error('Error fetching saved posts:', err)
    }
  }

  useEffect(() => {
    fetchUserProfile()
    fetchUserPosts()
    fetchSavedPosts()
  }, [])

  // Create new post
  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.description.trim() || !newPost.file) {
      alert('Please fill in all fields and select a file')
      return
    }

    try {
      const formData = new FormData()
      formData.append('title', newPost.title)
      formData.append('description', newPost.description)
      formData.append('caption', `${newPost.title} - ${newPost.description}`)
      formData.append('file', newPost.file)

      const response = await fetch('http://localhost:4000/api/posts', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const newPostData = await response.json()
        const formattedPost = {
          id: newPostData.id,
          title: newPostData.title,
          description: newPostData.description,
          imageUrl: newPostData.imageUrl,
          fileType: 'image' as const,
          likes: 0,
          comments: 0,
          saves: 0,
          createdAt: new Date().toISOString(),
          user: {
            id: userProfile?.id || '',
            username: userProfile?.username || '',
            avatar: userProfile?.avatar || ''
          }
        }
        
        setUserPosts([formattedPost, ...userPosts])
        setNewPost({ title: '', description: '', file: null, imageUrl: '' })
        setShowCreateModal(false)
        alert('Post created successfully!')
      } else {
        throw new Error('Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Error creating post')
    }
  }

  // Edit post
  const handleEditPost = async () => {
    if (!editingPost || !editPost.title.trim() || !editPost.description.trim()) {
      alert('Please fill in all fields')
      return
    }

    try {
      const response = await fetch(`http://localhost:4000/api/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editPost.title,
          description: editPost.description
        }),
      })

      if (response.ok) {
        setUserPosts(userPosts.map(post => 
          post.id === editingPost.id 
            ? { ...post, title: editPost.title, description: editPost.description }
            : post
        ))
        setShowEditPostModal(false)
        setEditingPost(null)
        setEditPost({ title: '', description: '', file: null, imageUrl: '' })
        alert('Post updated successfully!')
      } else {
        throw new Error('Failed to update post')
      }
    } catch (error) {
      console.error('Error updating post:', error)
      alert('Error updating post')
    }
  }

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await fetch(`http://localhost:4000/api/posts/${postId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setUserPosts(userPosts.filter(post => post.id !== postId))
        alert('Post deleted successfully!')
      } else {
        throw new Error('Failed to delete post')
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Error deleting post')
    }
  }

  // Upload avatar
  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      alert('Please select a file')
      return
    }

    try {
      const formData = new FormData()
      formData.append('avatar', avatarFile)

      const response = await fetch('http://localhost:4000/api/user/avatar', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setUserProfile(prev => prev ? { ...prev, avatar: result.avatarUrl } : null)
        setShowAvatarModal(false)
        setAvatarFile(null)
        setAvatarPreview(null)
        alert('Avatar updated successfully!')
      } else {
        throw new Error('Failed to upload avatar')
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Error uploading avatar')
    }
  }

  // Handle file selection for new post
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setNewPost({ ...newPost, file, imageUrl: url })
    }
  }

  // Handle avatar file selection
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setAvatarFile(file)
      setAvatarPreview(url)
    }
  }

  // Open edit post modal
  const openEditPostModal = (post: Post) => {
    setEditingPost(post)
    setEditPost({
      title: post.title,
      description: post.description,
      file: null,
      imageUrl: post.imageUrl
    })
    setShowEditPostModal(true)
  }

  // Filter posts based on search
  const filteredPosts = activeTab === 'created' 
    ? userPosts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : savedPosts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description.toLowerCase().includes(searchQuery.toLowerCase())
      )

  return (
    <div className="min-h-screen bg-white">
      {/* Pinterest Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-lg font-medium">Today</span>
          </div>

          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search your Pins"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-full border-none outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                99+
              </span>
            </button>
            <button 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Messages"
              aria-label="Messages"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors">
              Your Pins
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden cursor-pointer">
              <img
                src={userProfile?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Profile Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-6">
            <div className="relative w-20 h-20">
              <img
                src={userProfile?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
              />
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute bottom-0 right-0 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-50 transition-colors"
                title="Change profile picture"
                aria-label="Change profile picture"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            
            <div>
              <h1 className="text-4xl font-bold mb-2">{userProfile?.fullname || 'Your Name'}</h1>
              <p className="text-gray-600">{userProfile?.postsCount || 0} pins • {userProfile?.savedPostsCount || 0} saved</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowProfileModal(true)}
              className="px-4 py-2 bg-gray-200 rounded-full font-medium hover:bg-gray-300 transition-colors"
            >
              Edit profile
            </button>
            <button 
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="More options"
              aria-label="More options"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-8 border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('created')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'created'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Created
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'saved'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Saved
          </button>
        </div>

        {/* Filter and Create Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
              <Filter className="h-4 w-4" />
              <span>Group</span>
            </button>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-96">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="break-inside-avoid bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer relative"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button className="bg-red-600 text-white px-4 py-2 rounded-full font-medium hover:bg-red-700 transition-colors">
                        Save
                      </button>
                    </div>
                    
                    {/* Post Actions */}
                    {activeTab === 'created' && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditPostModal(post)
                            }}
                            className="bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full transition-colors"
                            title="Edit post"
                            aria-label="Edit post"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePost(post.id)
                            }}
                            className="bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full transition-colors"
                            title="Delete post"
                            aria-label="Delete post"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {post.title && (
                    <div className="p-3">
                      <h3 className="font-medium text-gray-900 line-clamp-2">{post.title}</h3>
                      {post.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-3">{post.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{post.likes} likes</span>
                        <span>{post.comments} comments</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
                <div className="w-16 h-16 bg-orange-200 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📌</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4">
                {activeTab === 'created' ? 'No pins created yet' : 'No saved pins yet'}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                {activeTab === 'created' 
                  ? 'Start creating and sharing your ideas with the world!'
                  : 'Save pins you love to organize your ideas.'
                }
              </p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors"
              >
                {activeTab === 'created' ? 'Create your first pin' : 'Browse pins'}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Create Pin</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drop your file here, or{' '}
                    <label className="text-red-500 hover:text-red-600 cursor-pointer font-medium">
                      browse
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </p>
                </div>
                
                {newPost.imageUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                    <div className="relative rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={newPost.imageUrl}
                        alt="Preview"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Add a title"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  aria-label="Post title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newPost.description}
                  onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
                  placeholder="Tell everyone what your Pin is about"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  aria-label="Post description"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Create Pin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditPostModal && editingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit Pin</h3>
              <button
                onClick={() => setShowEditPostModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Image
                </label>
                <div className="relative rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={editPost.imageUrl}
                    alt="Current"
                    className="w-full h-32 object-cover"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editPost.title}
                  onChange={(e) => setEditPost({ ...editPost, title: e.target.value })}
                  placeholder="Add a title"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  aria-label="Edit post title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editPost.description}
                  onChange={(e) => setEditPost({ ...editPost, description: e.target.value })}
                  placeholder="Tell everyone what your Pin is about"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  aria-label="Edit post description"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditPostModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditPost}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Update Pin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Update Profile Picture</h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {avatarPreview && (
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">Preview of your new profile picture</p>
              </div>
            )}
            
            <div className="text-center mb-6">
              <label className="cursor-pointer bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors inline-block">
                Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                />
              </label>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAvatarModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAvatarUpload}
                disabled={!avatarFile}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Picture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  defaultValue={userProfile?.fullname || ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  aria-label="Full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={userProfile?.email || ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  aria-label="Email address"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowProfileModal(false)
                  alert('Profile updated successfully!')
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

