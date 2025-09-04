'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  Search, 
  Filter, 
  Download,
  UserPlus,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  MoreVertical,
  Mail,
  Calendar,
  Activity
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'EMPLOYER' | 'ADMIN' | 'SUPER_ADMIN'
  status: 'active' | 'inactive' | 'suspended' | 'banned'
  emailVerified: boolean
  createdAt: string
  lastLogin: string
  profile?: {
    title?: string
    location?: string
    hourlyRate?: number
  }
  _count?: {
    jobs: number
    applications: number
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filterRole !== 'all' && { role: filterRole }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(searchQuery && { search: searchQuery })
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.users || getMockUsers())
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Error fetching users:', error)
      // Use mock data for development
      setUsers(getMockUsers())
      setTotalPages(5)
    } finally {
      setLoading(false)
    }
  }, [currentPage, filterRole, filterStatus, searchQuery])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const getMockUsers = (): User[] => [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'USER',
      status: 'active',
      emailVerified: true,
      createdAt: '2024-01-10T10:00:00Z',
      lastLogin: '2024-01-15T14:30:00Z',
      profile: {
        title: 'Senior Developer',
        location: 'New York, NY',
        hourlyRate: 125
      },
      _count: {
        jobs: 0,
        applications: 5
      }
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@company.com',
      role: 'EMPLOYER',
      status: 'active',
      emailVerified: true,
      createdAt: '2024-01-08T09:00:00Z',
      lastLogin: '2024-01-15T11:00:00Z',
      profile: {
        title: 'HR Manager',
        location: 'San Francisco, CA'
      },
      _count: {
        jobs: 12,
        applications: 0
      }
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'USER',
      status: 'suspended',
      emailVerified: false,
      createdAt: '2024-01-05T08:00:00Z',
      lastLogin: '2024-01-12T10:00:00Z',
      profile: {
        title: 'UI Designer',
        location: 'Austin, TX',
        hourlyRate: 95
      },
      _count: {
        jobs: 0,
        applications: 3
      }
    }
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchUsers()
  }

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return

    try {
      const response = await fetch('/api/admin/users/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers, action })
      })

      if (!response.ok) throw new Error('Bulk action failed')
      
      fetchUsers()
      setSelectedUsers([])
    } catch (error) {
      console.error('Error performing bulk action:', error)
    }
  }

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error(`${action} failed`)
      
      fetchUsers()
    } catch (error) {
      console.error(`Error performing ${action}:`, error)
    }
  }


  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'destructive'
      case 'ADMIN': return 'default'
      case 'EMPLOYER': return 'secondary'
      default: return 'outline'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'suspended': return 'destructive'
      case 'banned': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Users Management</h1>
          <p className="text-gray-600 mt-1">Manage user accounts and permissions</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>
            
            <select
              className="px-3 py-2 border rounded-md"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="USER">Users</option>
              <option value="EMPLOYER">Employers</option>
              <option value="ADMIN">Admins</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>
            
            <select
              className="px-3 py-2 border rounded-md"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
            
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedUsers.length} users selected
              </span>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
                Activate
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('suspend')}>
                Suspend
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(users.map(u => u.id))
                        } else {
                          setSelectedUsers([])
                        }
                      }}
                      checked={selectedUsers.length === users.length && users.length > 0}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id])
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white font-medium">
                                {user.name.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              {user.email}
                              {user.emailVerified ? (
                                <CheckCircle className="h-3 w-3 text-green-500 ml-1" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500 ml-1" />
                              )}
                            </div>
                            {user.profile?.title && (
                              <div className="text-xs text-gray-400">
                                {user.profile.title} • {user.profile.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getStatusBadgeColor(user.status)}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Activity className="h-3 w-3 mr-1" />
                            Last seen {new Date(user.lastLogin).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {user.role === 'EMPLOYER' ? (
                            <span className="text-xs">{user._count?.jobs || 0} jobs posted</span>
                          ) : (
                            <span className="text-xs">{user._count?.applications || 0} applications</span>
                          )}
                          {user.profile?.hourlyRate && (
                            <div className="text-xs text-gray-500">
                              ${user.profile.hourlyRate}/hr
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            className="text-gray-400 hover:text-gray-600"
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="text-gray-400 hover:text-gray-600"
                            title="Send Email"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          {user.status === 'active' ? (
                            <button
                              className="text-gray-400 hover:text-red-600"
                              title="Suspend User"
                              onClick={() => handleUserAction(user.id, 'suspend')}
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              className="text-gray-400 hover:text-green-600"
                              title="Activate User"
                              onClick={() => handleUserAction(user.id, 'activate')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            className="text-gray-400 hover:text-gray-600"
                            title="More Options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            const page = i + 1
            return (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            )
          })}
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}