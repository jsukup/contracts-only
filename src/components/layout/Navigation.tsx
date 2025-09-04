'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/Button'
import { 
  User, 
  LogOut, 
  Menu, 
  X, 
  Briefcase, 
  Home,
  Plus,
  Settings,
  Bell
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function Navigation() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === path
    }
    return pathname.startsWith(path)
  }

  // Role-based navigation items
  const getNavigationItems = () => {
    const baseItems = [
      { name: 'Home', href: '/', icon: Home, public: true }
    ]

    if (!user) {
      return [
        ...baseItems,
        { name: 'Browse Jobs', href: '/jobs', icon: Briefcase, public: true }
      ]
    }

    // Authenticated user navigation
    const userRole = user.publicMetadata?.role as string
    const isRecruiter = userRole === 'RECRUITER'
    
    if (isRecruiter) {
      return [
        ...baseItems,
        { name: 'Dashboard', href: '/employer/dashboard', icon: User, public: false },
        { name: 'Post Job', href: '/jobs/post', icon: Plus, public: false },
        { name: 'Browse Candidates', href: '/candidates', icon: Briefcase, public: false },
      ]
    } else {
      return [
        ...baseItems,
        { name: 'Browse Jobs', href: '/jobs', icon: Briefcase, public: true },
        { name: 'Dashboard', href: '/dashboard', icon: User, public: false },
      ]
    }
  }

  const navigationItems = getNavigationItems()

  const handleSignOut = async () => {
    if (signingOut) return
    
    try {
      setSigningOut(true)
      setDropdownOpen(false) // Close dropdown immediately
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
      // In case of error, still redirect to home
      router.push('/')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <img 
                src="/images/icons/android-chrome-192x192-light.png" 
                alt="ContractsOnly"
                className="h-8 w-8"
              />
              <div className="text-xl font-bold text-indigo-600">
                ContractsOnly
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-indigo-600",
                      isActive(item.href) 
                        ? "text-indigo-600" 
                        : "text-gray-700"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-2">
                {/* Notifications */}
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/notifications" className="text-gray-800 hover:text-indigo-600 font-medium">
                    <Bell className="h-4 w-4" />
                  </Link>
                </Button>

                {/* User Menu */}
                <div className="relative" ref={dropdownRef}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 text-gray-800 hover:text-indigo-600 font-medium"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden lg:block">
                      {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 
                       user?.username || 
                       user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 
                       'User'}
                    </span>
                  </Button>
                  
                  {/* Dropdown Menu */}
                  <div className={cn(
                    "absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg transition-all duration-200 z-50",
                    dropdownOpen ? "opacity-100 visible" : "opacity-0 invisible"
                  )}>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                      <Link
                        href="/profile/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {signingOut ? 'Signing Out...' : 'Sign Out'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : !isLoaded ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild className="text-gray-700 hover:text-indigo-600">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Link href="/sign-up">Get Started</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-indigo-600 text-white"
                        : "text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
              
              {/* Mobile Auth Section */}
              <div className="pt-4 mt-4 border-t">
                {user ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 
                           user?.username || 
                           user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 
                           'User'}
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      href="/profile/settings"
                      className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        handleSignOut()
                      }}
                      disabled={signingOut}
                      className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors w-full text-left disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/sign-in"
                      className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/sign-up"
                      className="block px-3 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}