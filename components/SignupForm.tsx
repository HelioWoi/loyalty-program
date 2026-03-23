'use client'

import { useState, FormEvent } from 'react'
import { SignupFormData } from '@/lib/types'
import { useVenue } from '@/hooks/useVenue'

interface SignupFormProps {
  onSubmit: (data: SignupFormData) => Promise<void>
  venueId?: string
}

export default function SignupForm({ onSubmit, venueId }: SignupFormProps) {
  const venue = useVenue(venueId)
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-8" style={{ backgroundColor: venue.colors.background }}>
      <div className="w-full max-w-md space-y-8">
        {/* Coffee Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: venue.colors.primary }}>
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              strokeWidth="2"
              style={{ color: venue.colors.accent }}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M3 3h15M8 3v3m4-3v3M5 6h12a2 2 0 012 2v10a4 4 0 01-4 4H7a4 4 0 01-4-4V8a2 2 0 012-2zm14 4h1a2 2 0 012 2v2a2 2 0 01-2 2h-1" 
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif" style={{ color: venue.colors.text }}>Join the Club</h1>
          <p style={{ color: venue.colors.textLight }}>Start earning rewards today</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: venue.colors.text }}>
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
              className={`w-full px-4 py-3 rounded-xl border-2 bg-white ${
                errors.full_name ? 'border-red-400' : 'border-[#D4C4B0]'
              } focus:outline-none transition-all placeholder:text-[#B5A89C]`}
              style={{ 
                color: venue.colors.text,
                borderColor: errors.full_name ? '#f87171' : '#D4C4B0'
              }}
              onFocus={(e) => !errors.full_name && (e.target.style.borderColor = venue.colors.primary)}
              onBlur={(e) => !errors.full_name && (e.target.style.borderColor = '#D4C4B0')}
              placeholder="Your full name"
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: venue.colors.text }}>
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
              className={`w-full px-4 py-3 rounded-xl border-2 bg-white ${
                errors.email ? 'border-red-400' : 'border-[#D4C4B0]'
              } focus:outline-none transition-all placeholder:text-[#B5A89C]`}
              style={{ 
                color: venue.colors.text,
                borderColor: errors.email ? '#f87171' : '#D4C4B0'
              }}
              onFocus={(e) => !errors.email && (e.target.style.borderColor = venue.colors.primary)}
              onBlur={(e) => !errors.email && (e.target.style.borderColor = '#D4C4B0')}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white font-medium py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            style={{ backgroundColor: isSubmitting ? venue.colors.textLight : venue.colors.primary }}
            onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = venue.colors.secondary)}
            onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = venue.colors.primary)}
          >
            {isSubmitting ? 'Joining...' : 'Join the Club'}
          </button>

          <p className="text-xs text-center leading-relaxed" style={{ color: venue.colors.textLight }}>
            By joining, you agree to receive coffee rewards and occasional updates.
          </p>
        </form>

        {/* Footer */}
        <p className="text-xs tracking-widest uppercase text-center" style={{ color: venue.colors.textMuted }}>
          POWERED BY MENULOVE
        </p>
      </div>
    </div>
  )
}
