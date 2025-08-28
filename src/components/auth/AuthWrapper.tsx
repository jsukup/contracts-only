'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import RoleSelectionModal from './RoleSelectionModal'

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, isLoaded } = useUser()
  const [showRoleSelection, setShowRoleSelection] = useState(false)

  useEffect(() => {
    // Show role selection if user is authenticated but hasn't selected a role yet
    if (isLoaded && user && !user.publicMetadata?.role) {
      setShowRoleSelection(true)
    }
  }, [isLoaded, user])

  const handleRoleSelect = async (role: 'USER' | 'RECRUITER') => {
    try {
      // Update user metadata with selected role
      await user?.update({
        publicMetadata: { role }
      })
      
      // Create user profile in Supabase
      await fetch('/api/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role,
          email: user?.primaryEmailAddress?.emailAddress 
        })
      })
      
      setShowRoleSelection(false)
    } catch (error) {
      console.error('Failed to update user role:', error)
    }
  }

  const handleCloseModal = () => {
    // Default to USER role if modal is closed without selection
    handleRoleSelect('USER')
  }

  return (
    <>
      {children}
      <RoleSelectionModal
        isOpen={showRoleSelection}
        onClose={handleCloseModal}
        onSelectRole={handleRoleSelect}
        userEmail={user?.primaryEmailAddress?.emailAddress || ''}
      />
    </>
  )
}