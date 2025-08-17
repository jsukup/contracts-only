"use client"

import { SessionProvider } from "next-auth/react"
import { NoSSR } from "./no-ssr"

type Props = {
  children?: React.ReactNode
}

export const NextAuthProvider = ({ children }: Props) => {
  return (
    <NoSSR>
      <SessionProvider>{children}</SessionProvider>
    </NoSSR>
  )
}