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
    const selectionId = Math.random().toString(36).substring(7)
    console.log(`[AUTH-WRAPPER-${selectionId}] Role selection started:`, { role })
    
    try {
      // Update user metadata with selected role first
      console.log(`[AUTH-WRAPPER-${selectionId}] Updating user metadata...`)
      await user?.update({
        publicMetadata: { role }
      })
      console.log(`[AUTH-WRAPPER-${selectionId}] User metadata updated successfully`)
      
      // Try server action first (more reliable), fallback to API call
      console.log(`[AUTH-WRAPPER-${selectionId}] Attempting server action profile creation...`)
      
      try {
        // Import server action dynamically to avoid issues
        const { createUserProfile } = await import('@/lib/actions/profile-actions')
        const result = await createUserProfile(role)
        
        if (result.success) {
          console.log(`[AUTH-WRAPPER-${selectionId}] Server action profile creation successful`)
          setShowRoleSelection(false)
          return
        } else {
          console.error(`[AUTH-WRAPPER-${selectionId}] Server action failed:`, result.error)
          throw new Error(`Server action failed: ${result.error}`)
        }
      } catch (serverActionError) {
        console.error(`[AUTH-WRAPPER-${selectionId}] Server action error:`, serverActionError)
        console.log(`[AUTH-WRAPPER-${selectionId}] Falling back to API call...`)
        
        // Fallback to API call with enhanced error handling
        const response = await fetch('/api/profile/create', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Request-Id': selectionId,
            'X-Auth-Source': 'AuthWrapper'
          },
          body: JSON.stringify({ 
            role,
            email: user?.primaryEmailAddress?.emailAddress 
          })
        })
        
        const responseData = await response.json()
        
        if (!response.ok) {
          console.error(`[AUTH-WRAPPER-${selectionId}] API call failed:`, {
            status: response.status,
            error: responseData.error,
            requestId: responseData.requestId
          })
          throw new Error(`API call failed: ${responseData.error}`)
        }
        
        console.log(`[AUTH-WRAPPER-${selectionId}] API call profile creation successful`)
      }
      
      setShowRoleSelection(false)
    } catch (error) {
      console.error(`[AUTH-WRAPPER-${selectionId}] Role selection failed:`, error)
      
      // Show user-friendly error message
      alert(`Failed to set up your profile: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support.`)
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