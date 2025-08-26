"use client"

import { AuthProvider } from "@/contexts/AuthContext"
import { NoSSR } from "./no-ssr"
import AuthWrapper from "@/components/auth/AuthWrapper"
import { ErrorBoundary } from "@/components/error/ErrorBoundary"
import { ToastProvider } from "@/components/ui/Toast"

type Props = {
  children?: React.ReactNode
}

export const SupabaseAuthProvider = ({ children }: Props) => {
  return (
    <NoSSR>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <AuthWrapper>
              {children}
            </AuthWrapper>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </NoSSR>
  )
}

// Keep the old export name for backward compatibility during migration
export const NextAuthProvider = SupabaseAuthProvider