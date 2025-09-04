'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ContactModal } from '@/components/modals/ContactModal'
import { Mail, Heart } from 'lucide-react'

export function Footer() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  const currentYear = new Date().getFullYear()

  return (
    <>
      <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Left side - Company info */}
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-center md:text-left">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-gray-900">ContractsOnly</span>
              </div>
              <div className="text-sm text-gray-600">
                <p>© {currentYear} ContractsOnly. All rights reserved.</p>
              </div>
            </div>

            {/* Right side - Contact and links */}
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-6">
              {/* Links */}
              <div className="flex items-center space-x-6 text-sm">
                <a 
                  href="/privacy" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Privacy Policy"
                >
                  Privacy
                </a>
                <a 
                  href="/terms" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Terms of Service"
                >
                  Terms
                </a>
              </div>

              {/* Contact button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsContactModalOpen(true)}
                className="flex items-center space-x-2 bg-white hover:bg-gray-50"
                aria-label="Contact us for feedback or support"
              >
                <Mail className="h-4 w-4" />
                <span>Contact Us</span>
              </Button>
            </div>
          </div>

          {/* Bottom section - Made with love */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center space-x-1">
                <span>Made with</span>
                <Heart className="h-3 w-3 text-red-500 fill-current" />
                <span>for the contract community</span>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <ContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
    </>
  )
}