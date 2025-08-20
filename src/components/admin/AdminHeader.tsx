'use client'

import { useState } from 'react'
import { 
  Search, 
  Bell, 
  MessageSquare,
  Settings,
  LogOut,
  User,
  Shield,
  HelpCircle,
  Moon,
  Sun
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export function AdminHeader() {
  const { data: session } = useSession()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implement search functionality
    console.log('Searching for:', searchQuery)
  }

  const notifications = [
    {
      id: 1,
      type: 'user',
      message: 'New user registration',
      time: '5 minutes ago',
      unread: true
    },
    {
      id: 2,
      type: 'job',
      message: 'Job posting pending approval',
      time: '1 hour ago',
      unread: true
    },
    {
      id: 3,
      type: 'payment',
      message: 'Payment received: $299',
      time: '2 hours ago',
      unread: false
    },
    {
      id: 4,
      type: 'alert',
      message: 'System backup completed',
      time: '3 hours ago',
      unread: false
    }
  ]

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users, jobs, applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden md:inline-block px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded">
                ⌘K
              </kbd>
            </div>
          </form>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4 ml-6">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {darkMode ? (
                <Sun className="h-5 w-5 text-gray-600" />
              ) : (
                <Moon className="h-5 w-5 text-gray-600" />
              )}
            </button>

            {/* Messages */}
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Notifications</h3>
                      <Badge variant="secondary">{unreadCount} new</Badge>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          notification.unread ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.unread ? 'bg-blue-500' : 'bg-gray-300'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-200">
                    <Button variant="link" className="w-full" asChild>
                      <Link href="/admin/notifications">View All Notifications</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Help */}
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <HelpCircle className="h-5 w-5 text-gray-600" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {session?.user?.name?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {session?.user?.name || 'Admin User'}
                  </p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfile && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {session?.user?.name || 'Admin User'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {session?.user?.email || 'admin@contractsonly.com'}
                    </p>
                  </div>
                  <div className="p-2">
                    <Link
                      href="/admin/profile"
                      className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      <User className="h-4 w-4" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      href="/admin/security"
                      className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Security Settings</span>
                    </Link>
                    <Link
                      href="/admin/settings"
                      className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Admin Settings</span>
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}