'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Bell, 
  BellOff, 
  Check, 
  Trash2, 
  Loader2, 
  Briefcase, 
  UserCheck, 
  UserX,
  MessageSquare,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

interface Notification {
  id: string
  type: 'application_update' | 'job_match' | 'review_received' | 'message' | 'system'
  title: string
  message: string
  isRead: boolean
  createdAt: string
  relatedJob?: {
    id: string
    title: string
    company: string
  }
  relatedApplication?: {
    id: string
    status: string
  }
}

export default function NotificationsPage() {
  const { user } = useUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    if (!user) {
      redirect('/sign-in')
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user, filter])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'unread') params.append('unread', 'true')
      
      const response = await fetch(`/api/notifications?${params}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (ids: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds: ids,
          action: 'markAsRead'
        })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            ids.includes(notif.id) ? { ...notif, isRead: true } : notif
          )
        )
        setSelectedIds(new Set())
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const handleDelete = async (ids: string[]) => {
    if (!confirm('Are you sure you want to delete these notifications?')) return

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds: ids,
          action: 'delete'
        })
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => !ids.includes(notif.id)))
        setSelectedIds(new Set())
      }
    } catch (error) {
      console.error('Error deleting notifications:', error)
    }
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)))
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'application_update':
        return <Briefcase className="h-5 w-5" />
      case 'job_match':
        return <UserCheck className="h-5 w-5 text-green-500" />
      case 'review_received':
        return <Star className="h-5 w-5 text-yellow-500" />
      case 'message':
        return <MessageSquare className="h-5 w-5 text-blue-500" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }

  if (!user || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-muted-foreground mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {notifications.length > 0 && (
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === notifications.length && notifications.length > 0}
                    onChange={selectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size > 0 
                      ? `${selectedIds.size} selected`
                      : 'Select all'
                    }
                  </span>
                </div>
                
                {selectedIds.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkAsRead(Array.from(selectedIds))}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Mark as read
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(Array.from(selectedIds))}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`transition-colors ${
                  !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(notification.id)}
                      onChange={() => toggleSelection(notification.id)}
                      className="h-4 w-4 mt-1 rounded border-gray-300"
                    />
                    
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          
                          {notification.relatedJob && (
                            <Link
                              href={`/jobs/${notification.relatedJob.id}`}
                              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mt-2"
                            >
                              View job: {notification.relatedJob.title}
                            </Link>
                          )}
                          
                          {notification.relatedApplication && (
                            <Link
                              href={`/applications/${notification.relatedApplication.id}`}
                              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mt-2"
                            >
                              View application
                            </Link>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.isRead && (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {getTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}