'use client'

interface LandingPageProps {
  onJoinClick: () => void
}

export default function LandingPage({ onJoinClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#EDE8E3] flex flex-col items-center justify-center p-6 sm:p-8">
      <div className="flex flex-col items-center justify-center max-w-md w-full text-center space-y-8">
        {/* Coffee Icon */}
        <div className="w-20 h-20 bg-[#3D2817] rounded-2xl flex items-center justify-center shadow-lg">
          <svg 
            className="w-10 h-10 text-[#D4A574]" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            strokeWidth="2"
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
          <p className="text-[#D4A574] text-sm font-medium tracking-[0.2em] uppercase">
            TAP & EARN
          </p>
          <h1 className="text-5xl sm:text-6xl font-serif text-[#2C1810] leading-tight">
            Your Coffee
          </h1>
          <h2 className="text-5xl sm:text-6xl font-serif italic text-[#2C1810]">
            Rewards
          </h2>
        </div>

        {/* Description */}
        <p className="text-[#6B5D54] text-base leading-relaxed max-w-sm">
          Join the exclusive circle of coffee lovers at Backstreet Cafe.
        </p>

        {/* Join Button */}
        <button
          onClick={onJoinClick}
          className="w-full max-w-sm bg-[#3D2817] hover:bg-[#2C1810] text-white font-medium py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
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
        <p className="text-[#B5A89C] text-xs tracking-widest uppercase mt-8">
          POWERED BY MENULOVE
        </p>
      </div>
    </div>
  )
}
