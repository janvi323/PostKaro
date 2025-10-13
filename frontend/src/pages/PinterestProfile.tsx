import { useState } from 'react'
import { MoreHorizontal, Plus, Upload, X } from 'lucide-react'
import { useAuth } from '../components/AuthWrapper'

interface Pin {
  id: string
  imageUrl: string
  title: string
  description: string
  saves: number
}

interface Board {
  id: string
  name: string
  coverImage: string
  pinCount: number
  isSecret: boolean
}

interface NewPin {
  title: string
  description: string
  imageUrl: string
}

const mockPins: Pin[] = Array.from({ length: 24 }, (_, i) => ({
  id: `pin-${i}`,
  imageUrl: `https://picsum.photos/236/${300 + (i * 30)}?random=${i + 100}`,
  title: `Pin ${i + 1}`,
  description: `Beautiful inspiration saved to PostKaro`,
  saves: Math.floor(Math.random() * 1000) + 10,
}))

const mockBoards: Board[] = [
  {
    id: 'board-1',
    name: 'Travel Ideas',
    coverImage: 'https://picsum.photos/236/300?random=travel',
    pinCount: 142,
    isSecret: false,
  },
  {
    id: 'board-2',
    name: 'Home Decor',
    coverImage: 'https://picsum.photos/236/300?random=home',
    pinCount: 89,
    isSecret: false,
  },
  {
    id: 'board-3',
    name: 'Recipes',
    coverImage: 'https://picsum.photos/236/300?random=food',
    pinCount: 203,
    isSecret: true,
  },
  {
    id: 'board-4',
    name: 'Fashion',
    coverImage: 'https://picsum.photos/236/300?random=fashion',
    pinCount: 156,
    isSecret: false,
  },
]

export function PinterestProfile() {
  const [activeTab, setActiveTab] = useState<'created' | 'saved'>('created')
  const [viewMode, setViewMode] = useState<'boards' | 'pins'>('pins')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPin, setNewPin] = useState<NewPin>({ title: '', description: '', imageUrl: '' })
  const [userPins, setUserPins] = useState<Pin[]>(mockPins)
  const { user, updateAvatar } = useAuth()

  const handleUpdateAvatar = () => {
    // Cycle through different uploaded profile pictures
    const avatars = [
      'http://localhost:4000/images/dp/3d215613-51b6-4cf1-a1d3-ff0789799fa1.png',
      'http://localhost:4000/images/dp/4de17361-cb91-4b8d-a19f-da13ded70c13.png',
      'http://localhost:4000/images/dp/9c501a2e-b226-4660-aad8-566083472d80.png'
    ]
    const currentIndex = avatars.indexOf(user?.avatar || '')
    const nextIndex = (currentIndex + 1) % avatars.length
    updateAvatar(avatars[nextIndex])
    
    // Force page refresh to update all avatar instances
    window.location.reload()
  }

  const handleCreatePin = () => {
    if (newPin.title && newPin.description && newPin.imageUrl) {
      const pin: Pin = {
        id: `user-pin-${Date.now()}`,
        imageUrl: newPin.imageUrl,
        title: newPin.title,
        description: newPin.description,
        saves: 0,
      }
      setUserPins([pin, ...userPins])
      setNewPin({ title: '', description: '', imageUrl: '' })
      setShowCreateModal(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          {/* Profile Picture */}
          <div className="relative inline-block mb-6">
            <img
              src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user-profile'}
              alt="Profile"
              className="w-32 h-32 rounded-full"
            />
          </div>
          
          {/* Name and Username */}
          <h1 className="text-4xl font-semibold text-gray-900 mb-2">{user?.username || 'Your Name'}</h1>
          <p className="text-lg text-gray-600 mb-1">@{user?.username || 'username'}</p>
          <p className="text-gray-600 mb-6">0 followers</p>
          
          {/* Action Buttons */}
          <div className="flex justify-center space-x-3 mb-8">
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-2 rounded-full font-medium transition-colors">
              Share
            </button>
            <button 
              onClick={handleUpdateAvatar}
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-2 rounded-full font-medium transition-colors"
            >
              Edit profile
            </button>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-900 p-2 rounded-full transition-colors">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('created')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'created'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Created
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'saved'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Saved
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setViewMode('pins')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'pins'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Pins
            </button>
            <button
              onClick={() => setViewMode('boards')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'boards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Boards
            </button>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'pins' ? (
          /* Pins Grid */
          <div>
            {/* Create Pin Button */}
            <div className="flex justify-center mb-8">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Pin
              </button>
            </div>

            {/* Pinterest-style Masonry Grid */}
            <div 
              className="mx-auto"
              style={{
                columnCount: 'auto',
                columnWidth: '236px',
                columnGap: '16px',
                maxWidth: '1260px'
              }}
            >
              {userPins.map((pin) => (
                <div
                  key={pin.id}
                  className="inline-block w-full mb-4 group cursor-pointer"
                  style={{ breakInside: 'avoid' }}
                >
                  <div className="relative bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow duration-200">
                    <img
                      src={pin.imageUrl}
                      alt={pin.title}
                      className="w-full block"
                      loading="lazy"
                    />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-semibold text-sm">
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Boards Grid */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {mockBoards.map((board) => (
              <div key={board.id} className="group cursor-pointer">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-2">
                  <img
                    src={board.coverImage}
                    alt={board.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {board.isSecret && (
                    <div className="absolute top-3 left-3 bg-gray-900 bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                      Secret
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-gray-900">{board.name}</h3>
                <p className="text-sm text-gray-600">{board.pinCount} pins</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Pin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Create Pin</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pin image URL
                </label>
                <div className="relative">
                  <Upload className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    value={newPin.imageUrl}
                    onChange={(e) => setNewPin({ ...newPin, imageUrl: e.target.value })}
                    placeholder="Add the URL of your image"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newPin.title}
                  onChange={(e) => setNewPin({ ...newPin, title: e.target.value })}
                  placeholder="Add a title"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newPin.description}
                  onChange={(e) => setNewPin({ ...newPin, description: e.target.value })}
                  placeholder="Tell everyone what your Pin is about"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
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
                onClick={handleCreatePin}
                disabled={!newPin.title || !newPin.description || !newPin.imageUrl}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}