'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OwnerLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      if (!data.user) {
        throw new Error('Login failed')
      }

      // Verify owner exists
      const { data: ownerData, error: ownerError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .single()

      if (ownerError || !ownerData) {
        throw new Error('Owner account not found')
      }

      // Success! Redirect to admin
      router.push('/admin')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#f5f5f0' }}>
      <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-2" style={{ color: '#2d2d2d' }}>
            Owner Login
          </h1>
          <p className="text-sm" style={{ color: '#8b8680' }}>
            Access your loyalty program dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="your@email.com"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8b8680' }}>
                Password
              </label>
              <a href="/forgot-password" className="text-xs" style={{ color: '#c8a882' }}>
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm"
              style={{ borderColor: '#d4d4d4', color: '#2d2d2d' }}
              placeholder="Enter your password"
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
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          {/* Signup Link */}
          <p className="text-xs text-center mt-4" style={{ color: '#8b8680' }}>
            Don't have an account?{' '}
            <a href="/owner-signup" className="underline" style={{ color: '#c8a882' }}>
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
