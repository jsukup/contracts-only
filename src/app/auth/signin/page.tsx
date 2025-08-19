'use client'

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Loader2, Chrome } from "lucide-react"
import Link from "next/link"

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const error = searchParams.get("error")

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn("google", { callbackUrl })
    } catch (error) {
      console.error("Sign in error:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            ContractsOnly
          </Link>
          <h2 className="mt-6 text-3xl font-bold">
            Sign in to your account
          </h2>
          <p className="mt-2 text-muted-foreground">
            Find your next contract opportunity
          </p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  {error === "OAuthAccountNotLinked"
                    ? "This email is already associated with another account."
                    : error === "AccessDenied"
                    ? "Access was denied. Please try again."
                    : "An error occurred during sign in. Please try again."}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Chrome className="w-4 h-4 mr-2" />
                )}
                {isLoading ? "Signing in..." : "Continue with Google"}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  By signing in, you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-primary">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline hover:text-primary">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            New to ContractsOnly?{" "}
            <Link href="/jobs" className="font-medium text-primary hover:underline">
              Browse jobs without signing in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}