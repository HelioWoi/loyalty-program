'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OwnerSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    phone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      // 1. Create auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create account')
      }

      // 2. Create venue owner record
      const { data: ownerData, error: ownerError } = await supabase
        .from('venue_owners')
        .insert({
          auth_user_id: authData.user.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
        })
        .select()
        .single()

      if (ownerError) throw ownerError

      // 3. Create venue ID from business name
      const venueId = formData.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const subdomain = venueId.split('-')[0]

      // 4. Create venue
      const { error: venueError } = await supabase
        .from('venues')
        .insert({
          id: venueId,
          owner_id: ownerData.id,
          venue_name: formData.businessName,
          subdomain: subdomain,
          active: true,
        })

      if (venueError) throw venueError

      // 5. Create default campaign
      const { error: campaignError } = await supabase
        .from('loyalty_campaigns')
        .insert({
          campaign_name: `${formData.businessName} POINTS CLUB`,
          points_per_checkin: 5,
          venue_id: venueId,
          owner_id: ownerData.id,
          active: true,
        })

      if (campaignError) throw campaignError

      // Success! Redirect to admin
      router.push('/admin')
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#f5f5f0' }}>
      <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-2" style={{ color: '#2d2d2d' }}>
            Start Your Loyalty Program
          </h1>
          <p className="text-sm" style={{ color: '#8b8680' }}>
            Join MenuLove and reward your customers
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8b8680' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm"
              style={{ borderColor: '#d4d4d4', color: '#2d2d2d' }}
              placeholder="John Smith"
            />
          </div>

          {/* Business Name */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8b8680' }}>
              Business Name
            </label>
            <input
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm"
              style={{ borderColor: '#d4d4d4', color: '#2d2d2d' }}
              placeholder="Backstreet Cafe"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8b8680' }}>
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm"
              style={{ borderColor: '#d4d4d4', color: '#2d2d2d' }}
              placeholder="john@backstreetcafe.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8b8680' }}>
              Phone (Optional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm"
              style={{ borderColor: '#d4d4d4', color: '#2d2d2d' }}
              placeholder="+61 400 000 000"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8b8680' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm"
              style={{ borderColor: '#d4d4d4', color: '#2d2d2d' }}
              placeholder="Min. 6 characters"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8b8680' }}>
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm"
              style={{ borderColor: '#d4d4d4', color: '#2d2d2d' }}
              placeholder="Re-enter password"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl text-sm text-center" style={{ backgroundColor: '#fee', color: '#c00' }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#c8a882' }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Login Link */}
          <p className="text-xs text-center mt-4" style={{ color: '#8b8680' }}>
            Already have an account?{' '}
            <a href="/owner-login" className="underline" style={{ color: '#c8a882' }}>
              Log in
            </a>
          </p>
        </form>

        {/* Pricing Info */}
        <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: '#f5f5f0' }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#c8a882', color: 'white' }}>
              14 DAYS FREE
            </span>
          </div>
          <p className="text-xs text-center font-medium" style={{ color: '#2d2d2d' }}>
            $29.90/month per location
          </p>
          <p className="text-[10px] text-center mt-1" style={{ color: '#8b8680' }}>
            Includes analytics, email notifications, and unlimited members
          </p>
          <p className="text-[10px] text-center mt-2 font-medium" style={{ color: '#c8a882' }}>
            Start rewarding your customers today!
          </p>
        </div>
      </div>
    </div>
  )
}
