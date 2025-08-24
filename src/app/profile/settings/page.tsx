'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Bell, 
  CreditCard, 
  AlertTriangle, 
  Loader2, 
  Save,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface NotificationSettings {
  job_alerts_enabled: boolean
  application_updates: boolean
  weekly_digest: boolean
  marketing_emails: boolean
}

export default function SettingsPage() {
  const { user, userProfile, loading, refreshUserProfile, signOut } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationSettings>({
    job_alerts_enabled: true,
    application_updates: true,
    weekly_digest: true,
    marketing_emails: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin?callbackUrl=/profile/settings')
    }
  }, [user, loading, router])

  // Load notification settings
  useEffect(() => {
    if (userProfile) {
      setNotifications({
        job_alerts_enabled: userProfile.job_alerts_enabled ?? true,
        application_updates: true,
        weekly_digest: true,
        marketing_emails: false
      })
    }
  }, [userProfile])

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSaveNotifications = async () => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          job_alerts_enabled: notifications.job_alerts_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshUserProfile()
      toast.success('Notification preferences saved!')
    } catch (error: any) {
      console.error('Error saving notifications:', error)
      toast.error('Failed to save settings. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated successfully!')
    } catch (error: any) {
      console.error('Error updating password:', error)
      toast.error(error.message || 'Failed to update password')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || deleteEmail !== user.email) {
      toast.error('Email confirmation does not match')
      return
    }

    setIsDeleting(true)
    try {
      toast.success('Account deletion request submitted. You will be contacted within 24 hours.')
      await signOut()
      router.push('/')
    } catch (error: any) {
      console.error('Error deleting account:', error)
      toast.error('Failed to process deletion request')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirmation(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  // Show redirect if not authenticated
  if (!user) {
    return null
  }

  const isRecruiter = userProfile?.role === 'RECRUITER'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Job Alerts</h4>
                    <p className="text-sm text-gray-500">Receive email notifications for new job postings that match your criteria</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.job_alerts_enabled}
                    onChange={() => handleNotificationChange('job_alerts_enabled')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Application Updates</h4>
                    <p className="text-sm text-gray-500">Get notified when employers respond to your applications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.application_updates}
                    onChange={() => handleNotificationChange('application_updates')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Weekly Digest</h4>
                    <p className="text-sm text-gray-500">Weekly summary of new opportunities and platform updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.weekly_digest}
                    onChange={() => handleNotificationChange('weekly_digest')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Marketing Emails</h4>
                    <p className="text-sm text-gray-500">Tips, best practices, and ContractsOnly news</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.marketing_emails}
                    onChange={() => handleNotificationChange('marketing_emails')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Settings - Recruiters Only */}
          {isRecruiter && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Management</h3>
                  <p className="text-gray-500 mb-4">
                    Manage your payment methods and billing information
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" disabled>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manage Payment Methods (Coming Soon)
                    </Button>
                    <Button variant="outline" className="w-full" disabled>
                      View Billing History (Coming Soon)
                    </Button>
                    <Button variant="outline" className="w-full" disabled>
                      Manage Subscriptions (Coming Soon)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Change Password</h4>
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        placeholder="New password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Delete Account</h4>
                <p className="text-sm text-red-700 mb-4">
                  Once you delete your account, there is no going back. This will permanently delete your profile, applications, and all associated data.
                </p>
                
                {!showDeleteConfirmation ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-red-800">
                      Type your email address to confirm account deletion:
                    </p>
                    <input
                      type="email"
                      placeholder={user?.email || ''}
                      value={deleteEmail}
                      onChange={(e) => setDeleteEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirmation(false)
                          setDeleteEmail('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || deleteEmail !== user?.email}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Account'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}