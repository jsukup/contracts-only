'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, Loader2, X } from 'lucide-react'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  userProfile?: any
  loading?: boolean
  onDelete?: () => Promise<void>
}

export default function DeleteAccountModal({ 
  isOpen, 
  onClose, 
  userProfile, 
  loading = false,
  onDelete 
}: DeleteAccountModalProps) {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const confirmationText = 'DELETE MY ACCOUNT'
  const isConfirmationValid = confirmText === confirmationText

  const handleDelete = async () => {
    if (!isConfirmationValid) return
    
    try {
      setIsDeleting(true)
      setError(null)
      
      // Use the onDelete prop if provided, otherwise show an error
      if (onDelete) {
        await onDelete()
      } else {
        throw new Error('Delete functionality not implemented')
      }
      
      // Redirect to home page after successful deletion
      router.push('/?deleted=true')
      onClose()
    } catch (error) {
      console.error('Delete account error:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (isDeleting) return // Prevent closing during deletion
    setConfirmText('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full p-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={handleClose} />
        
        <div className="relative w-full max-w-md p-6 mx-auto bg-white rounded-lg shadow-xl">
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Warning icon */}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Delete Your Account
          </h3>

          {/* Warning message */}
          <div className="text-sm text-gray-600 mb-6 space-y-3">
            <p>
              <strong>This action cannot be undone.</strong> Deleting your account will permanently:
            </p>
            <ul className="text-left list-disc list-inside space-y-1">
              <li>Remove your profile and account information</li>
              <li>Delete all your job posts and applications</li>
              <li>Remove all your reviews and ratings</li>
              <li>Delete your skills and preferences</li>
              <li>Cancel any active notifications</li>
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Confirmation input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To confirm deletion, type: <span className="font-mono font-bold">{confirmationText}</span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isDeleting}
              placeholder={confirmationText}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
            />
          </div>

          {/* User info */}
          {userProfile && (
            <div className="mb-6 p-3 bg-gray-50 rounded-md text-left">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Account:</span> {userProfile.email}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Name:</span> {userProfile.name || 'Not set'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Role:</span> {userProfile.role}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handleClose}
              disabled={isDeleting}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={!isConfirmationValid || isDeleting || loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
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
      </div>
    </div>
  )
}