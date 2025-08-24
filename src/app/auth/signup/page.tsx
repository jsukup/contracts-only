import { Metadata } from 'next'
import SignUpForm from '@/components/auth/SignUpForm'

export const metadata: Metadata = {
  title: 'Sign Up - ContractsOnly',
  description: 'Create your ContractsOnly account and start finding contract opportunities.',
}

export default function SignUpPage() {
  return <SignUpForm />
}