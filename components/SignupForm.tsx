'use client'

import { useState, FormEvent } from 'react'
import { SignupFormData } from '@/lib/types'

interface SignupFormProps {
  onSubmit: (data: SignupFormData) => Promise<void>
}

export default function SignupForm({ onSubmit }: SignupFormProps) {
  const [formData, setFormData] = useState<SignupFormData>({
    full_name: '',
    email: '',
  })
  const [errors, setErrors] = useState<Partial<SignupFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    const newErrors: Partial<SignupFormData> = {}
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Signup error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-amber-900">Join the Club</h1>
          <p className="text-amber-700">Start earning rewards today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-amber-900 mb-2">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.full_name}
              onChange={(e) => {
                setFormData({ ...formData, full_name: e.target.value })
                setErrors({ ...errors, full_name: undefined })
              }}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.full_name ? 'border-red-500' : 'border-amber-200'
              } focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all`}
              placeholder="Your full name"
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-amber-900 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value })
                setErrors({ ...errors, email: undefined })
              }}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.email ? 'border-red-500' : 'border-amber-200'
              } focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all`}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-900 hover:bg-amber-800 disabled:bg-amber-400 text-white font-semibold py-4 px-8 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Joining...' : 'Join the Club'}
          </button>

          <p className="text-xs text-center text-amber-600 leading-relaxed">
            By joining, you agree to receive coffee rewards and occasional updates.
          </p>
        </form>
      </div>

      <footer className="text-sm text-amber-600 mt-8">
        Powered by MenuLove™
      </footer>
    </div>
  )
}
