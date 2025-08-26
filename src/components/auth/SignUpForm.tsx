'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { signUpSchema, SignUpFormData } from '@/lib/validation/auth'
import { Eye, EyeOff, Loader2, UserCheck, Briefcase, Chrome } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'

export default function SignUpForm() {
  const router = useRouter()
  const { signUpWithEmail, signInWithGoogle, loading, error } = useAuth()
  const { addToast } = useToast()
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'USER',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false)
  const [showEmailVerificationMessage, setShowEmailVerificationMessage] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendError, setResendError] = useState('')

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})
    
    // Validate form data
    const validation = signUpSchema.safeParse(formData)
    if (!validation.success) {
      const errors: Record<string, string> = {}
      if (validation.error?.errors) {
        validation.error.errors.forEach((error) => {
          if (error.path[0]) {
            errors[error.path[0] as string] = error.message
          }
        })
      }
      setValidationErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await signUpWithEmail(
        formData.email,
        formData.password,
        formData.name,
        formData.role
      )
      
      // Check if email confirmation is required (user not immediately confirmed)
      if (result?.user && !result.user.email_confirmed_at) {
        // Show email verification message
        setShowEmailVerificationMessage(true)
        
        addToast({
          type: 'info',
          title: 'Account created!',
          message: 'Please check your email to verify your account.'
        })
      } else {
        // User is immediately confirmed, redirect to dashboard
        addToast({
          type: 'success',
          title: 'Welcome to ContractsOnly!',
          message: 'Your account has been created successfully.'
        })
        router.push('/dashboard?welcome=true')
      }
    } catch (error) {
      console.error('Sign up error:', error)
      // Error is handled by auth context
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleSelect = (role: 'USER' | 'RECRUITER') => {
    setFormData(prev => ({ ...prev, role }))
  }

  const handleGoogleSignUp = async () => {
    setIsSubmittingGoogle(true)
    try {
      // Google OAuth will handle both sign-in and sign-up
      // New users will be automatically registered
      await signInWithGoogle('/dashboard?welcome=true')
    } catch (error) {
      console.error('Google sign up error:', error)
      setIsSubmittingGoogle(false)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-gray-600">
              Join ContractsOnly and find your next opportunity
            </p>
          </div>
          
          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardContent className="p-6">
              {/* Email Verification Message */}
              {showEmailVerificationMessage && (
                <div className="mb-6 p-4 rounded-md bg-blue-50 border border-blue-200">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Check your email!</h3>
                    <p className="text-sm text-blue-700 mb-4">
                      We've sent a verification email to <strong>{formData.email}</strong>. 
                      Click the link in the email to verify your account and get started.
                    </p>
                    <div className="space-y-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsResending(true)
                          setResendSuccess(false)
                          setResendError('')
                          
                          try {
                            const response = await fetch('/api/auth/resend-verification', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: formData.email })
                            })
                            const data = await response.json()
                            
                            if (response.ok) {
                              setResendSuccess(true)
                              setResendCooldown(60) // Set 60 second cooldown after successful send
                              setTimeout(() => setResendSuccess(false), 3000)
                              
                              // Show success toast
                              addToast({
                                type: 'success',
                                title: 'Verification email sent!',
                                message: 'Check your inbox for the verification link.'
                              })
                            } else {
                              // Handle rate limiting and other errors gracefully
                              if (data.error?.includes('For security purposes, you can only request this after')) {
                                const match = data.error.match(/after (\d+) seconds/)
                                const seconds = match ? parseInt(match[1]) : 60
                                setResendCooldown(seconds)
                                setResendError(`Please wait ${seconds} seconds before requesting another email.`)
                                
                                addToast({
                                  type: 'warning',
                                  title: 'Rate limit reached',
                                  message: `Please wait ${seconds} seconds before requesting another email.`
                                })
                              } else if (data.error?.includes('rate limit')) {
                                setResendCooldown(60)
                                setResendError('Rate limit reached. Please wait before trying again.')
                                
                                addToast({
                                  type: 'warning',
                                  title: 'Rate limit reached',
                                  message: 'Please wait before trying again.'
                                })
                              } else {
                                setResendError(data.error || 'Failed to send verification email. Please try again.')
                                
                                addToast({
                                  type: 'error',
                                  title: 'Failed to send email',
                                  message: data.error || 'Please try again later.'
                                })
                              }
                            }
                          } catch (error) {
                            console.error('Failed to resend verification email:', error)
                            setResendError('Network error. Please check your connection and try again.')
                            
                            addToast({
                              type: 'error',
                              title: 'Network error',
                              message: 'Please check your connection and try again.'
                            })
                          } finally {
                            setIsResending(false)
                          }
                        }}
                        disabled={isResending || resendCooldown > 0}
                        className={`w-full font-medium transition-all disabled:opacity-50 ${
                          resendCooldown > 0 
                            ? 'bg-gray-100 border-2 border-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-white hover:bg-gray-50 border-2 border-blue-500 text-blue-700'
                        }`}
                      >
                        {isResending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : resendSuccess ? (
                          <>
                            <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Email Sent!
                          </>
                        ) : resendCooldown > 0 ? (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Wait {resendCooldown}s
                          </>
                        ) : (
                          'Resend Verification Email'
                        )}
                      </Button>
                      
                      {resendError && (
                        <div className="p-2 rounded-md bg-red-50 border border-red-200">
                          <p className="text-xs text-red-600">{resendError}</p>
                        </div>
                      )}
                      
                      <p className="text-xs text-blue-600">
                        {resendCooldown > 0 
                          ? `Please wait ${resendCooldown} seconds before trying again.`
                          : "Didn't receive the email? Check your spam folder or click above to resend."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{error.message}</p>
                </div>
              )}

              {!showEmailVerificationMessage && (
                <div className="space-y-4">
                  {/* Google Sign Up */}
                  <Button
                    onClick={handleGoogleSignUp}
                    disabled={isSubmittingGoogle || loading}
                    className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
                    variant="outline"
                  >
                    {isSubmittingGoogle ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Chrome className="w-4 h-4 mr-2" />
                    )}
                    {isSubmittingGoogle ? "Creating account..." : "Sign up with Google"}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or create account with email</span>
                    </div>
                  </div>

                  {/* Email/Password Sign Up Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your full name"
                  />
                  {validationErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your email"
                  />
                  {validationErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                  )}
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    I am a...
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleRoleSelect('USER')}
                      className={`flex items-center justify-center p-4 border rounded-lg transition-all ${
                        formData.role === 'USER'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      <UserCheck className="w-5 h-5 mr-2" />
                      <span className="font-medium">Contractor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleSelect('RECRUITER')}
                      className={`flex items-center justify-center p-4 border rounded-lg transition-all ${
                        formData.role === 'RECRUITER'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      <Briefcase className="w-5 h-5 mr-2" />
                      <span className="font-medium">Recruiter</span>
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.role === 'USER' 
                      ? 'Looking for contract opportunities' 
                      : 'Hiring contractors and posting jobs'
                    }
                  </p>
                  {validationErrors.role && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.role}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {isSubmitting || loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  By creating an account, you agree to our{' '}
                  <Link href="/terms" className="underline hover:text-indigo-600 text-indigo-600">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="underline hover:text-indigo-600 text-indigo-600">
                    Privacy Policy
                  </Link>
                </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="font-medium text-indigo-600 hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}