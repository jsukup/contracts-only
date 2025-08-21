"use client"

import { AuthProvider } from "@/contexts/AuthContext"
import { NoSSR } from "./no-ssr"

type Props = {
  children?: React.ReactNode
}

export const SupabaseAuthProvider = ({ children }: Props) => {
  return (
    <NoSSR>
      <AuthProvider>{children}</AuthProvider>
    </NoSSR>
  )
}

// Keep the old export name for backward compatibility during migration
export const NextAuthProvider = SupabaseAuthProvider