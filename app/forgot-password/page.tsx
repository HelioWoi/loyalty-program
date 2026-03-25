'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) throw resetError

      setMessage('Password reset link sent! Check your email.')
      setEmail('')
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f5f5f0' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <img 
              src="https://nuwmbaohgwuanvzotbef.supabase.co/storage/v1/object/public/media/logo%20menulove%20black.png"
              alt="MenuLove"
              className="h-12 mx-auto mb-6"
            />
            <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: '#2d2d2d' }}>
              Reset Password
            </h1>
            <p className="text-sm" style={{ color: '#8b8680' }}>
              Enter your email to receive a password reset link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#8b8680' }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                style={{ borderColor: '#d4cfc7', color: '#2d2d2d' }}
                placeholder="your@email.com"
              />
            </div>

            {error && (
              <div className="text-xs text-center p-3 rounded-lg" style={{ backgroundColor: '#fee', color: '#c00' }}>
                {error}
              </div>
            )}

            {message && (
              <div className="text-xs text-center p-3 rounded-lg" style={{ backgroundColor: '#efe', color: '#060' }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: '#c8a882', color: 'white' }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center mt-6">
              <Link href="/owner-login" className="text-xs" style={{ color: '#c8a882' }}>
                Back to login
              </Link>
            </div>
          </form>
        </div>

        <p className="text-xs text-center mt-6" style={{ color: '#8b8680' }}>
          Powered by MenuLove™
        </p>
      </div>
    </div>
  )
}
