'use client'

interface LandingPageProps {
  onJoinClick: () => void
}

export default function LandingPage({ onJoinClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col items-center justify-between p-6 sm:p-8">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl font-bold text-amber-900 tracking-tight">
            Tap & Earn
          </h1>
          <h2 className="text-2xl sm:text-3xl font-semibold text-amber-800">
            Your Coffee Rewards
          </h2>
          <p className="text-lg text-amber-700 leading-relaxed px-4">
            Join Backstreet Coffee Club in seconds and start your rewards journey.
          </p>
        </div>

        <button
          onClick={onJoinClick}
          className="w-full max-w-xs bg-amber-900 hover:bg-amber-800 text-white font-semibold py-4 px-8 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Join Now
        </button>
      </div>

      <footer className="text-sm text-amber-600 mt-8">
        Powered by MenuLove™
      </footer>
    </div>
  )
}
