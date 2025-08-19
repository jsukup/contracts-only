'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useWebSocket } from '@/lib/websocket'
import { toast } from 'react-hot-toast'

interface WebSocketContextType {
  isConnected: boolean
  sendMessage: (message: any) => void
  subscribe: (type: string, callback: (data: any) => void) => () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

interface WebSocketProviderProps {
  children: ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { data: session } = useSession()
  const ws = useWebSocket(session?.user?.id)

  useEffect(() => {
    if (session?.user?.id) {
      // Connect to WebSocket when user is authenticated
      ws.connect()

      // Subscribe to notifications and show toast messages
      const unsubscribeNotifications = ws.subscribeToNotifications((notification) => {
        toast.success(notification.title, {
          description: notification.message,
          duration: 5000
        })
      })

      const unsubscribeApplicationUpdates = ws.subscribeToApplicationUpdates((update) => {
        toast.info(`Application Update`, {
          description: `Your application for "${update.jobTitle}" has been ${update.status}`,
          duration: 5000
        })
      })

      const unsubscribeJobUpdates = ws.subscribeToJobUpdates((update) => {
        if (update.type === 'new_job') {
          toast.success('New Job Available', {
            description: `${update.title} at ${update.company}`,
            duration: 5000
          })
        }
      })

      // Cleanup on unmount or session change
      return () => {
        unsubscribeNotifications()
        unsubscribeApplicationUpdates()
        unsubscribeJobUpdates()
        ws.disconnect()
      }
    }
  }, [session?.user?.id, ws])

  const contextValue: WebSocketContextType = {
    isConnected: ws.isConnected,
    sendMessage: ws.sendMessage,
    subscribe: ws.subscribe
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
}

// Component to show connection status
export function WebSocketStatus() {
  const { isConnected } = useWebSocketContext()
  
  if (!isConnected) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>Live updates enabled</span>
      </div>
    </div>
  )
}