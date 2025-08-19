'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Check, Star, Zap, Shield, Users } from 'lucide-react'
import Link from 'next/link'
import { PRICING_PLANS, JOB_POSTING_PRICE, formatPrice, isPaymentsEnabled, createPaymentSession } from '@/lib/stripe'

export default function PricingPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')

  const handleSubscribe = async (planId: string) => {
    if (!session) {
      window.location.href = '/auth/signin?callbackUrl=/pricing'
      return
    }

    if (!isPaymentsEnabled()) {
      alert('Payments are currently disabled. All features are available for free during the preview period.')
      return
    }

    setLoading(planId)
    try {
      const { url } = await createPaymentSession({
        planId,
        userId: session.user.id,
        successUrl: `${window.location.origin}/dashboard?payment=success`,
        cancelUrl: `${window.location.origin}/pricing?payment=cancelled`
      })
      
      window.location.href = url
    } catch (error) {
      console.error('Payment error:', error)
      alert('Failed to start payment process. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const getYearlyPrice = (monthlyPrice: number) => monthlyPrice * 10 // 2 months free

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find the perfect plan for your contracting needs. Start with our free tier and upgrade as you grow.
          </p>
          
          {!isPaymentsEnabled() && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
              <p className="text-blue-800 text-sm">
                🎉 <strong>Preview Mode:</strong> All features are currently free during our beta period!
              </p>
            </div>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 'month'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => setBillingInterval('month')}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 'year'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => setBillingInterval('year')}
            >
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">Save 20%</Badge>
            </button>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {PRICING_PLANS.map((plan) => {
            const price = billingInterval === 'year' ? getYearlyPrice(plan.price) : plan.price
            const displayPrice = billingInterval === 'year' ? price / 12 : price

            return (
              <Card 
                key={plan.id} 
                className={`relative ${
                  plan.popular 
                    ? 'border-2 border-blue-500 shadow-lg scale-105' 
                    : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white px-3 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="text-muted-foreground">{plan.description}</p>
                  
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      {formatPrice(displayPrice)}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingInterval === 'year' ? 'mo' : plan.interval}
                    </span>
                    {billingInterval === 'year' && plan.price > 0 && (
                      <div className="text-sm text-green-600 mt-1">
                        Save {formatPrice((plan.price * 12) - getYearlyPrice(plan.price))} yearly
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Button 
                    className="w-full mb-6"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading === plan.id || (!isPaymentsEnabled() && plan.price > 0)}
                  >
                    {loading === plan.id ? (
                      'Processing...'
                    ) : plan.price === 0 ? (
                      'Get Started Free'
                    ) : !isPaymentsEnabled() ? (
                      'Coming Soon'
                    ) : (
                      'Upgrade Now'
                    )}
                  </Button>
                  
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Job Posting Pricing */}
        <div className="border-t pt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Job Posting Packages</h2>
            <p className="text-xl text-muted-foreground">
              Post jobs and find the perfect contractors for your projects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Single Job</CardTitle>
                <div className="text-2xl font-bold">{formatPrice(JOB_POSTING_PRICE.singleJob)}</div>
                <p className="text-sm text-muted-foreground">One-time posting</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    30-day active listing
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    Unlimited applications
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    Basic support
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500">
              <CardHeader className="text-center">
                <Badge className="mb-2 bg-blue-500">Best Value</Badge>
                <CardTitle className="text-lg">5 Job Pack</CardTitle>
                <div className="text-2xl font-bold">{formatPrice(JOB_POSTING_PRICE.jobPack5)}</div>
                <p className="text-sm text-muted-foreground">{formatPrice(JOB_POSTING_PRICE.jobPack5 / 5)} per job</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    5 job postings
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    60-day active listings
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    Priority support
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    Analytics dashboard
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-lg">10 Job Pack</CardTitle>
                <div className="text-2xl font-bold">{formatPrice(JOB_POSTING_PRICE.jobPack10)}</div>
                <p className="text-sm text-muted-foreground">{formatPrice(JOB_POSTING_PRICE.jobPack10 / 10)} per job</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    10 job postings
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    90-day active listings
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    Priority support
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    Advanced analytics
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Unlimited</CardTitle>
                <div className="text-2xl font-bold">{formatPrice(JOB_POSTING_PRICE.unlimited30Days)}</div>
                <p className="text-sm text-muted-foreground">30 days unlimited</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    Unlimited postings
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    30-day access
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    Dedicated support
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 text-green-500 mr-2" />
                    API access
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Comparison */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">Why Choose ContractsOnly?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Zap className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Find and hire contractors in days, not weeks. Our streamlined process gets you results fast.
              </p>
            </div>
            <div className="text-center">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Verified Talent</h3>
              <p className="text-muted-foreground">
                All contractors are vetted with verified skills, ratings, and work history.
              </p>
            </div>
            <div className="text-center">
              <Users className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Perfect Matches</h3>
              <p className="text-muted-foreground">
                Our smart matching algorithm connects you with contractors who fit your exact needs.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg mb-6">
              Join thousands of contractors and companies building the future of work.
            </p>
            <div className="space-x-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/jobs">Browse Jobs</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-purple-600" asChild>
                <Link href="/jobs/post">Post a Job</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}