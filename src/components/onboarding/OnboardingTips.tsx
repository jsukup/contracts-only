'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  X,
  Lightbulb,
  Users,
  Briefcase,
  Star,
  Search,
  DollarSign,
  ExternalLink
} from 'lucide-react'

interface OnboardingTip {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action?: {
    text: string
    href: string
  }
  targetRole?: 'contractor' | 'employer' | 'both'
}

const tips: OnboardingTip[] = [
  {
    id: 'complete-profile',
    title: 'Complete Your Profile',
    description: 'Profiles with skills, rates, and portfolio items get 3x more visibility from employers.',
    icon: <Users className="h-5 w-5" />,
    action: {
      text: 'Complete Profile',
      href: '/profile'
    },
    targetRole: 'contractor'
  },
  {
    id: 'set-competitive-rates',
    title: 'Set Competitive Rates',
    description: 'Research market rates for your skills. Transparent rates increase your application rate by 40%.',
    icon: <DollarSign className="h-5 w-5" />,
    action: {
      text: 'Update Rates',
      href: '/profile'
    },
    targetRole: 'contractor'
  },
  {
    id: 'use-job-alerts',
    title: 'Set Up Job Alerts',
    description: 'Get notified when new jobs match your skills and preferences. Never miss opportunities.',
    icon: <Search className="h-5 w-5" />,
    action: {
      text: 'Create Alerts',
      href: '/dashboard/alerts'
    },
    targetRole: 'contractor'
  },
  {
    id: 'apply-quickly',
    title: 'Apply Early and Often',
    description: 'Jobs posted in the last 24 hours receive 5x more applications. Be among the first.',
    icon: <ExternalLink className="h-5 w-5" />,
    action: {
      text: 'Browse Jobs',
      href: '/jobs'
    },
    targetRole: 'contractor'
  },
  {
    id: 'clear-job-descriptions',
    title: 'Write Clear Job Descriptions',
    description: 'Jobs with detailed requirements and transparent rates receive 60% more quality applications.',
    icon: <Briefcase className="h-5 w-5" />,
    action: {
      text: 'Post a Job',
      href: '/jobs/post'
    },
    targetRole: 'employer'
  },
  {
    id: 'competitive-rates-employer',
    title: 'Offer Competitive Rates',
    description: 'Jobs with above-market rates attract better talent and fill 50% faster.',
    icon: <DollarSign className="h-5 w-5" />,
    action: {
      text: 'Research Rates',
      href: '/jobs'
    },
    targetRole: 'employer'
  },
  {
    id: 'respond-quickly',
    title: 'Respond to Applications Quickly',
    description: 'Fast response times improve your company rating and attract more applicants to future jobs.',
    icon: <Star className="h-5 w-5" />,
    targetRole: 'employer'
  }
]

interface OnboardingTipsProps {
  userRole?: 'contractor' | 'employer'
  className?: string
}

export function OnboardingTips({ userRole, className = '' }: OnboardingTipsProps) {
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set())
  const [currentTipIndex, setCurrentTipIndex] = useState(0)

  // Filter tips based on user role
  const relevantTips = tips.filter(tip => 
    !tip.targetRole || tip.targetRole === 'both' || tip.targetRole === userRole
  )

  const visibleTips = relevantTips.filter(tip => !dismissedTips.has(tip.id))

  useEffect(() => {
    // Load dismissed tips from localStorage
    const stored = localStorage.getItem('dismissed_tips')
    if (stored) {
      setDismissedTips(new Set(JSON.parse(stored)))
    }
  }, [])

  useEffect(() => {
    // Save dismissed tips to localStorage
    if (dismissedTips.size > 0) {
      localStorage.setItem('dismissed_tips', JSON.stringify(Array.from(dismissedTips)))
    }
  }, [dismissedTips])

  useEffect(() => {
    // Cycle through tips every 10 seconds
    if (visibleTips.length > 1) {
      const interval = setInterval(() => {
        setCurrentTipIndex(prev => (prev + 1) % visibleTips.length)
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [visibleTips.length])

  const dismissTip = (tipId: string) => {
    setDismissedTips(prev => new Set([...prev, tipId]))
    
    // Adjust current index if needed
    if (currentTipIndex >= visibleTips.length - 1) {
      setCurrentTipIndex(0)
    }
  }

  const dismissAllTips = () => {
    const allTipIds = relevantTips.map(tip => tip.id)
    setDismissedTips(new Set(allTipIds))
    localStorage.setItem('tips_dismissed_all', 'true')
  }

  // Don't render if no tips or user has dismissed all
  if (visibleTips.length === 0 || localStorage.getItem('tips_dismissed_all') === 'true') {
    return null
  }

  const currentTip = visibleTips[currentTipIndex]

  return (
    <Card className={`border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="bg-blue-100 p-2 rounded-full flex-shrink-0 mt-0.5">
            <Lightbulb className="h-4 w-4 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="bg-white p-1 rounded">
                    {currentTip.icon}
                  </div>
                  <h3 className="font-medium text-blue-900">{currentTip.title}</h3>
                </div>
                <p className="text-sm text-blue-800 mb-3">{currentTip.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {currentTip.action && (
                      <Button size="sm" variant="outline" className="bg-white" asChild>
                        <a href={currentTip.action.href}>
                          {currentTip.action.text}
                        </a>
                      </Button>
                    )}
                    
                    {visibleTips.length > 1 && (
                      <div className="flex space-x-1">
                        {visibleTips.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              index === currentTipIndex ? 'bg-blue-500' : 'bg-blue-200'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissTip(currentTip.id)}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {visibleTips.length > 2 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissAllTips}
              className="text-xs text-blue-600 hover:text-blue-800 p-0 h-auto"
            >
              Don't show tips again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}