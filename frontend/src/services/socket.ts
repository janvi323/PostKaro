import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null
  private static instance: SocketService

  static getInstance() {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  connect(userId?: string) {
    if (!this.socket) {
      this.socket = io('http://localhost:4000', {
        query: { userId },
        autoConnect: true,
      })
      
      this.socket.on('connect', () => {
        console.log('Connected to server')
      })
      
      this.socket.on('disconnect', () => {
        console.log('Disconnected from server')
      })
    }
    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }

  // Chat-specific methods
  joinRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('join-room', roomId)
    }
  }

  leaveRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('leave-room', roomId)
    }
  }

  sendMessage(roomId: string, message: any) {
    if (this.socket) {
      this.socket.emit('send-message', { roomId, message })
    }
  }

  onMessageReceived(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('message-received', callback)
    }
  }

  onUserTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user-typing', callback)
    }
  }

  sendTyping(roomId: string, isTyping: boolean) {
    if (this.socket) {
      this.socket.emit('typing', { roomId, isTyping })
    }
  }
}

export default SocketService