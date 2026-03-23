'use client'

interface SuccessPageProps {
  onDone: () => void
}

export default function SuccessPage({ onDone }: SuccessPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col items-center justify-between p-6 sm:p-8">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full text-center space-y-8">
        <div className="space-y-6">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-amber-900">
            You&apos;re in.
          </h1>
          
          <h2 className="text-2xl sm:text-3xl font-semibold text-amber-800">
            Welcome to Backstreet Coffee Club.
          </h2>
          
          <p className="text-lg text-amber-700 leading-relaxed px-4">
            Your rewards journey starts now.
          </p>
        </div>

        <button
          onClick={onDone}
          className="w-full max-w-xs bg-amber-900 hover:bg-amber-800 text-white font-semibold py-4 px-8 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Done
        </button>
      </div>

      <footer className="text-sm text-amber-600 mt-8">
        Powered by MenuLove™
      </footer>
    </div>
  )
}
