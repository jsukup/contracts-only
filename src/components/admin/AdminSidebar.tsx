'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  Settings,
  BarChart3,
  Shield,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  MessageSquare,
  Flag,
  Database,
  Key,
  Activity,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: Home,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    badge: 'new',
  },
  {
    title: 'Jobs',
    href: '/admin/jobs',
    icon: Briefcase,
    badge: '12',
  },
  {
    title: 'Applications',
    href: '/admin/applications',
    icon: FileText,
  },
  {
    title: 'Payments',
    href: '/admin/payments',
    icon: DollarSign,
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Recruiter Dashboard',
    href: '/admin/recruiter-dashboard',
    icon: Target,
    badge: 'NEW'
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: Flag,
  },
  {
    title: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
  },
  {
    title: 'Messages',
    href: '/admin/messages',
    icon: MessageSquare,
  },
  {
    title: 'Database',
    href: '/admin/database',
    icon: Database,
  },
  {
    title: 'Monitoring',
    href: '/admin/monitoring',
    icon: Activity,
    badge: '24/7'
  },
  {
    title: 'Security',
    href: '/admin/security',
    icon: Shield,
  },
  {
    title: 'API Keys',
    href: '/admin/api-keys',
    icon: Key,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={cn(
      "bg-gray-900 text-white transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold">Admin Panel</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-gray-800 rounded"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg transition-colors group",
                    isActive 
                      ? "bg-blue-600 text-white" 
                      : "hover:bg-gray-800 text-gray-300 hover:text-white"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={cn(
                      "flex-shrink-0",
                      collapsed ? "h-5 w-5" : "h-5 w-5"
                    )} />
                    {!collapsed && (
                      <span className="text-sm font-medium">{item.title}</span>
                    )}
                  </div>
                  {!collapsed && item.badge && (
                    <span className={cn(
                      "px-2 py-1 text-xs rounded-full",
                      item.badge === 'new' 
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-800 p-4">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">AD</span>
              </div>
              <div>
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-gray-400">admin@contractsonly.com</p>
              </div>
            </div>
            <button className="p-1 hover:bg-gray-800 rounded">
              <LogOut className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <button className="w-full flex justify-center p-1 hover:bg-gray-800 rounded">
            <LogOut className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* System Status */}
      {!collapsed && (
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-400">System Operational</span>
          </div>
        </div>
      )}
    </div>
  )
}