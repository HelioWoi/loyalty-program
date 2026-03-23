'use client'

import { useEffect } from 'react'
import { useVenue } from '@/hooks/useVenue'
import { useNotificationSound } from '@/hooks/useNotificationSound'

interface SuccessPageProps {
  onDone: () => void
  venueId?: string
}

export default function SuccessPage({ onDone, venueId }: SuccessPageProps) {
  const venue = useVenue(venueId)
  const { playNotification } = useNotificationSound()

  useEffect(() => {
    playNotification()
  }, [playNotification])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-8" style={{ backgroundColor: venue.colors.background }}>
      <div className="flex flex-col items-center justify-center max-w-md w-full text-center space-y-8">
        {/* Success Icon */}
        <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: venue.colors.primary }}>
          <svg
            className="w-14 h-14"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            style={{ color: venue.colors.accent }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Success Message */}
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl font-serif" style={{ color: venue.colors.text }}>
            You&apos;re in.
          </h1>
          
          <h2 className="text-2xl sm:text-3xl font-serif" style={{ color: venue.colors.text }}>
            Welcome to {venue.brand}.
          </h2>
          
          <p className="text-base leading-relaxed px-4 max-w-sm mx-auto" style={{ color: venue.colors.textLight }}>
            Your rewards journey starts now.
          </p>
        </div>

        {/* Done Button */}
        <button
          onClick={onDone}
          className="w-full max-w-sm text-white font-medium py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl"
          style={{ backgroundColor: venue.colors.primary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = venue.colors.secondary}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = venue.colors.primary}
        >
          Done
        </button>

        {/* Footer */}
        <p className="text-xs tracking-widest uppercase mt-8" style={{ color: venue.colors.textMuted }}>
          POWERED BY MENULOVE
        </p>
      </div>
    </div>
  )
}
