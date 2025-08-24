'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import SignInForm from "@/components/auth/SignInForm"

export default function SignInPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  // Redirect if already signed in
  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Don't show signin page if already authenticated
  if (user) {
    return null
  }

  return <SignInForm />
}