'use client'

import { useVenue } from '@/hooks/useVenue'

interface LandingPageProps {
  onJoinClick: () => void
  venueId?: string
}

export default function LandingPage({ onJoinClick, venueId }: LandingPageProps) {
  const venue = useVenue(venueId)
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-8" style={{ backgroundColor: venue.colors.background }}>
      <div className="flex flex-col items-center justify-center max-w-md w-full text-center space-y-8">
        {/* Coffee Icon */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: venue.colors.primary }}>
          <svg 
            className="w-10 h-10" 
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

        {/* Title Section */}
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-[0.2em] uppercase" style={{ color: venue.colors.accent }}>
            TAP & EARN
          </p>
          <h1 className="text-5xl sm:text-6xl font-serif leading-tight" style={{ color: venue.colors.text }}>
            Your Coffee
          </h1>
          <h2 className="text-5xl sm:text-6xl font-serif italic" style={{ color: venue.colors.text }}>
            Rewards
          </h2>
        </div>

        {/* Description */}
        <p className="text-base leading-relaxed max-w-sm" style={{ color: venue.colors.textLight }}>
          {venue.description}
        </p>

        {/* Join Button */}
        <button
          onClick={onJoinClick}
          className="w-full max-w-sm text-white font-medium py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
          style={{ backgroundColor: venue.colors.primary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = venue.colors.secondary}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = venue.colors.primary}
        >
          Join Now
          <svg 
            className="w-4 h-4 group-hover:translate-x-1 transition-transform" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Footer */}
        <p className="text-xs tracking-widest uppercase mt-8" style={{ color: venue.colors.textMuted }}>
          POWERED BY MENULOVE
        </p>
      </div>
    </div>
  )
}
