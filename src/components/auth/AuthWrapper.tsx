'use client'

import { useAuth } from '@/contexts/AuthContext'
import RoleSelectionModal from './RoleSelectionModal'

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { 
    user, 
    showRoleSelection, 
    setShowRoleSelection, 
    updateUserRole 
  } = useAuth()

  const handleRoleSelect = async (role: 'USER' | 'RECRUITER') => {
    try {
      await updateUserRole(role)
    } catch (error) {
      console.error('Failed to update user role:', error)
    }
  }

  const handleCloseModal = () => {
    // Default to USER role if modal is closed without selection
    updateUserRole('USER')
  }

  return (
    <>
      {children}
      <RoleSelectionModal
        isOpen={showRoleSelection}
        onClose={handleCloseModal}
        onSelectRole={handleRoleSelect}
        userEmail={user?.email || ''}
      />
    </>
  )
}