'use client'

import { useEffect, useRef } from 'react'

interface AdPlaceholderProps {
  className?: string
  adSlot?: string
  responsive?: boolean
}

export function AdPlaceholder({ 
  className = "", 
  adSlot = "your-ad-slot-id",
  responsive = true 
}: AdPlaceholderProps) {
  const adRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only load ads in production or when specifically enabled
    const shouldLoadAds = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_ADS === 'true'
    
    if (shouldLoadAds && typeof window !== 'undefined') {
      try {
        // Initialize Google AdSense if not already initialized
        if (!window.adsbygoogle) {
          const script = document.createElement('script')
          script.async = true
          script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
          script.crossOrigin = 'anonymous'
          document.head.appendChild(script)
          
          window.adsbygoogle = window.adsbygoogle || []
        }
        
        // Push the ad
        if (window.adsbygoogle && adRef.current) {
          window.adsbygoogle.push({})
        }
      } catch (error) {
        console.error('Error loading AdSense:', error)
      }
    }
  }, [])

  // Development/staging placeholder
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_ADS !== 'true') {
    return (
      <div className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center min-h-[250px] ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 text-sm font-medium mb-2">Advertisement</div>
          <div className="text-gray-500 text-xs">Google AdSense Placeholder</div>
          <div className="text-gray-400 text-xs mt-1">300x250 Display Ad</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex justify-center ${className}`} ref={adRef}>
      <ins
        className="adsbygoogle"
        style={{ 
          display: responsive ? 'block' : 'inline-block',
          width: responsive ? '100%' : '300px',
          height: responsive ? 'auto' : '250px',
          minHeight: '250px'
        }}
        data-ad-client="ca-pub-YOUR_PUBLISHER_ID" // Replace with your actual publisher ID
        data-ad-slot={adSlot}
        data-ad-format={responsive ? 'auto' : undefined}
        data-full-width-responsive={responsive ? 'true' : undefined}
      />
    </div>
  )
}

// TypeScript declaration for window.adsbygoogle
declare global {
  interface Window {
    adsbygoogle: any[]
  }
}