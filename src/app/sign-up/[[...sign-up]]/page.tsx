import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: 
                "bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors",
              card: "bg-white border border-gray-200 shadow-lg rounded-lg",
              headerTitle: "text-2xl font-bold text-gray-900",
              headerSubtitle: "text-gray-600",
              socialButtonsBlockButton: 
                "w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md transition-colors",
              formFieldInput: 
                "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500",
              footerActionLink: "text-indigo-600 hover:text-indigo-500 font-medium"
            },
            layout: {
              socialButtonsPlacement: "top",
              socialButtonsVariant: "iconButton",
              termsPageUrl: "/terms",
              privacyPageUrl: "/privacy"
            }
          }}
          afterSignUpUrl="/onboarding"
        />
      </div>
    </div>
  )
}