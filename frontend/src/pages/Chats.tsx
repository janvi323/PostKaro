import { useState, useEffect, useRef } from 'react'
import { Search, Phone, Video, MoreHorizontal, Send, Smile, Paperclip, MessageCircle, Plus, UserPlus } from 'lucide-react'
// Note: socket.io-client would need to be installed first
// import SocketService from '../services/socket'

interface Chat {
  id: string
  name: string
  avatar: string
  lastMessage: string
  timestamp: string
  unread: number
  isOnline: boolean
}

interface Message {
  id: string
  text: string
  timestamp: string
  isOwn: boolean
  avatar?: string
}

interface User {
  _id: string
  username: string
  fullname: string
  picture?: string
}

const mockChats: Chat[] = [
  {
    id: '1',
    name: 'Sarah Wilson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    lastMessage: 'Hey! Did you see that amazing art piece?',
    timestamp: '2m',
    unread: 2,
    isOnline: true,
  },
  {
    id: '2',
    name: 'Design Team',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team',
    lastMessage: 'The new mockups are ready for review',
    timestamp: '1h',
    unread: 0,
    isOnline: false,
  },
  {
    id: '3',
    name: 'Alex Chen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    lastMessage: 'Thanks for sharing that recipe!',
    timestamp: '3h',
    unread: 1,
    isOnline: true,
  },
  {
    id: '4',
    name: 'Emma Davis',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
    lastMessage: 'See you at the coffee shop tomorrow',
    timestamp: '1d',
    unread: 0,
    isOnline: false,
  },
]

const mockMessages: Message[] = [
  {
    id: '1',
    text: 'Hey! How are you doing?',
    timestamp: '10:30 AM',
    isOwn: false,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
  },
  {
    id: '2',
    text: "I'm doing great! Just saw your latest post, it's amazing!",
    timestamp: '10:32 AM',
    isOwn: true,
  },
  {
    id: '3',
    text: 'Thank you so much! I spent hours working on it',
    timestamp: '10:33 AM',
    isOwn: false,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
  },
  {
    id: '4',
    text: 'It definitely shows! The attention to detail is incredible',
    timestamp: '10:35 AM',
    isOwn: true,
  },
  {
    id: '5',
    text: 'Did you see that amazing art piece?',
    timestamp: '10:38 AM',
    isOwn: false,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
  },
]

export function Chats() {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(mockChats[0])
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Search users function
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/search-users?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const users = await response.json()
        setSearchResults(users)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    }
    setIsSearching(false)
  }

  // Handle search input change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery)
      } else {
        setSearchResults([])
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Start new chat with user
  const startNewChat = (user: User) => {
    const newChat: Chat = {
      id: user._id,
      name: user.fullname || user.username,
      avatar: user.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
      lastMessage: 'Start a conversation',
      timestamp: 'now',
      unread: 0,
      isOnline: false
    }
    setSelectedChat(newChat)
    setShowNewChat(false)
    setSearchQuery('')
    setSearchResults([])
  }

  // Socket.IO integration (would work when socket.io-client is installed)
  useEffect(() => {
    // const socketService = SocketService.getInstance()
    // socketService.connect('janviranout')
    
    // if (selectedChat) {
    //   socketService.joinRoom(selectedChat.id)
    //   
    //   socketService.onMessageReceived((message) => {
    //     setMessages(prev => [...prev, message])
    //   })
    //   
    //   socketService.onUserTyping((data) => {
    //     setIsTyping(data.isTyping && data.userId !== 'janviranout')
    //   })
    // }
    
    // return () => {
    //   if (selectedChat) {
    //     socketService.leaveRoom(selectedChat.id)
    //   }
    // }
  }, [selectedChat])

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        text: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
      }
      setMessages([...messages, message])
      
      // Socket.IO send message (would work when socket.io-client is installed)
      // if (selectedChat) {
      //   const socketService = SocketService.getInstance()
      //   socketService.sendMessage(selectedChat.id, message)
      // }
      
      setNewMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    
    // Socket.IO typing indicator (would work when socket.io-client is installed)
    // if (selectedChat) {
    //   const socketService = SocketService.getInstance()
    //   socketService.sendTyping(selectedChat.id, e.target.value.length > 0)
    // }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex" style={{ background: 'linear-gradient(135deg, #f8f4f0 0%, #fff5f5 100%)' }}>
      {/* Chat List */}
      <div className="w-1/3 border-r border-red-100 flex flex-col" style={{ backgroundColor: '#f8f4f0' }}>
        {/* Chat List Header */}
        <div className="p-6 border-b border-red-100" style={{ backgroundColor: '#fff5f5' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Messages</h2>
            <button 
              onClick={() => setShowNewChat(!showNewChat)}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
            >
              {showNewChat ? <MessageCircle className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-400" />
            <input
              type="text"
              placeholder={showNewChat ? "Search people..." : "Search conversations..."}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-12 pr-4 py-3 border border-red-200 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent shadow-sm"
              style={{ backgroundColor: '#ffffff' }}
            />
          </div>
        </div>

        {/* Search Results or Chat List */}
        <div className="flex-1 overflow-y-auto">
          {showNewChat && searchQuery ? (
            <div className="p-4">
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">People</h3>
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => startNewChat(user)}
                      className="p-3 cursor-pointer hover:bg-red-50 transition-colors rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={user.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                          alt={user.fullname || user.username}
                          className="w-10 h-10 rounded-full border-2 border-red-200"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{user.fullname || user.username}</h4>
                          <p className="text-sm text-gray-600 truncate">@{user.username}</p>
                        </div>
                        <Plus className="h-4 w-4 text-red-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery.length > 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No users found</p>
                </div>
              ) : null}
            </div>
          ) : (
            // Regular chat list
            <div>
              {mockChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setSelectedChat(chat)
                    setShowNewChat(false)
                  }}
                  className={`p-4 cursor-pointer hover:bg-red-50 transition-colors border-b border-red-50 ${
                    selectedChat?.id === chat.id ? 'bg-red-100 border-red-200' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img
                        src={chat.avatar}
                        alt={chat.name}
                        className="w-14 h-14 rounded-full border-2 border-white shadow-sm"
                      />
                      {chat.isOnline && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                        <span className="text-xs text-gray-500">{chat.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                    </div>
                    {chat.unread > 0 && (
                      <div className="bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-semibold">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Content */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-6 border-b border-red-100 flex items-center justify-between shadow-sm" style={{ backgroundColor: '#fff5f5' }}>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={selectedChat.avatar}
                  alt={selectedChat.name}
                  className="w-12 h-12 rounded-full border-2 border-red-200 shadow-sm"
                />
                {selectedChat.isOnline && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{selectedChat.name}</h3>
                <p className="text-sm text-red-600 font-medium">
                  {selectedChat.isOnline ? 'Active now' : 'Last seen recently'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-3 hover:bg-red-100 rounded-full transition-colors">
                <Phone className="h-5 w-5 text-red-600" />
              </button>
              <button className="p-3 hover:bg-red-100 rounded-full transition-colors">
                <Video className="h-5 w-5 text-red-600" />
              </button>
              <button className="p-3 hover:bg-red-100 rounded-full transition-colors">
                <MoreHorizontal className="h-5 w-5 text-red-600" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundColor: '#fdfcfc' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end space-x-3 max-w-xs lg:max-w-md ${message.isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!message.isOwn && (
                    <img
                      src={message.avatar}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full border border-red-200"
                    />
                  )}
                  <div
                    className={`px-5 py-3 rounded-3xl shadow-sm ${
                      message.isOwn
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white rounded-br-lg'
                        : 'bg-white text-gray-900 rounded-bl-lg border border-red-100'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${message.isOwn ? 'text-red-100' : 'text-gray-500'}`}>
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-6 border-t border-red-100" style={{ backgroundColor: '#fff5f5' }}>
            <div className="flex items-center space-x-4">
              <button className="p-3 hover:bg-red-100 rounded-full transition-colors">
                <Paperclip className="h-5 w-5 text-red-600" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="w-full px-6 py-3 border-2 border-red-200 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 shadow-sm"
                  style={{ backgroundColor: '#ffffff' }}
                />
                <button className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 hover:bg-red-100 rounded-full transition-colors">
                  <Smile className="h-5 w-5 text-red-500" />
                </button>
              </div>
              <button
                onClick={sendMessage}
                className="p-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full hover:from-red-600 hover:to-red-700 transition-all shadow-lg transform hover:scale-105"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#fdfcfc' }}>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <MessageCircle className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Your Messages</h3>
            <p className="text-gray-600 mb-4">Send private photos and messages to a friend or group</p>
            <button 
              onClick={() => setShowNewChat(true)}
              className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-semibold"
            >
              Send Message
            </button>
          </div>
        </div>
      )}
    </div>
  )
}