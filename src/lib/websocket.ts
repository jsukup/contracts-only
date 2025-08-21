// WebSocket client for real-time updates
// This provides a foundation for real-time notifications and updates

export interface WebSocketMessage {
  type: 'notification' | 'application_update' | 'job_update' | 'user_online'
  data: any
  timestamp: number
  userId?: string
}

export class WebSocketClient {
  private static instance: WebSocketClient
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private userId: string | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()

  static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient()
    }
    return WebSocketClient.instance
  }

  connect(userId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.userId = userId
    
    // In development, use mock WebSocket
    if (process.env.NODE_ENV === 'development') {
      this.setupMockWebSocket()
      return
    }

    // In production, connect to actual WebSocket server
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
    
    try {
      this.ws = new WebSocket(`${wsUrl}?userId=${userId}`)
      this.setupEventListeners()
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      this.scheduleReconnect()
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.sendMessage({
        type: 'user_online',
        data: { userId: this.userId },
        timestamp: Date.now()
      })
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.scheduleReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  private setupMockWebSocket(): void {
    console.log('Setting up mock WebSocket for development')
    
    // Simulate connection
    setTimeout(() => {
      this.triggerEvent('connection', { connected: true })
    }, 100)

    // Simulate periodic notifications for testing
    if (this.userId) {
      this.startMockNotifications()
    }
  }

  private startMockNotifications(): void {
    // Simulate new notifications every 30 seconds in development
    setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance
        const mockNotifications = [
          {
            type: 'notification',
            data: {
              id: Date.now().toString(),
              title: 'New Job Match',
              message: 'A new job matching your skills has been posted',
              type: 'job_match'
            },
            timestamp: Date.now()
          },
          {
            type: 'application_update',
            data: {
              applicationId: 'mock-app-' + Date.now(),
              status: 'reviewed',
              jobTitle: 'Senior React Developer'
            },
            timestamp: Date.now()
          }
        ]

        const randomNotification = mockNotifications[Math.floor(Math.random() * mockNotifications.length)]
        this.handleMessage(randomNotification)
      }
    }, 30000)
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log('WebSocket message received:', message)
    
    const listeners = this.listeners.get(message.type)
    if (listeners) {
      listeners.forEach(callback => callback(message.data))
    }

    // Handle global message types
    this.triggerEvent('message', message)
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId)
      }
    }, delay)
  }

  sendMessage(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, message not sent:', message)
    }
  }

  subscribe(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    
    this.listeners.get(type)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(type)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.listeners.delete(type)
        }
      }
    }
  }

  private triggerEvent(type: string, data: Record<string, unknown>): void {
    const listeners = this.listeners.get(type)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.listeners.clear()
    this.userId = null
    this.reconnectAttempts = 0
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // Convenience methods for common message types
  subscribeToNotifications(callback: (notification: any) => void): () => void {
    return this.subscribe('notification', callback)
  }

  subscribeToApplicationUpdates(callback: (update: any) => void): () => void {
    return this.subscribe('application_update', callback)
  }

  subscribeToJobUpdates(callback: (update: any) => void): () => void {
    return this.subscribe('job_update', callback)
  }

  // Send typing indicator for chat features (future enhancement)
  sendTyping(conversationId: string): void {
    this.sendMessage({
      type: 'user_online',
      data: { typing: true, conversationId },
      timestamp: Date.now()
    })
  }
}

// React hook for WebSocket integration
export function useWebSocket(userId?: string) {
  const ws = WebSocketClient.getInstance()
  
  const connect = () => {
    if (userId) {
      ws.connect(userId)
    }
  }

  const disconnect = () => {
    ws.disconnect()
  }

  const subscribe = (type: string, callback: (data: any) => void) => {
    return ws.subscribe(type, callback)
  }

  const sendMessage = (message: Omit<WebSocketMessage, 'timestamp'>) => {
    ws.sendMessage({
      ...message,
      timestamp: Date.now()
    })
  }

  return {
    connect,
    disconnect,
    subscribe,
    sendMessage,
    isConnected: ws.isConnected(),
    subscribeToNotifications: ws.subscribeToNotifications.bind(ws),
    subscribeToApplicationUpdates: ws.subscribeToApplicationUpdates.bind(ws),
    subscribeToJobUpdates: ws.subscribeToJobUpdates.bind(ws)
  }
}