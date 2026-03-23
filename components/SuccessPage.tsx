'use client'

interface SuccessPageProps {
  onDone: () => void
}

export default function SuccessPage({ onDone }: SuccessPageProps) {
  return (
    <div className="min-h-screen bg-[#EDE8E3] flex flex-col items-center justify-center p-6 sm:p-8">
      <div className="flex flex-col items-center justify-center max-w-md w-full text-center space-y-8">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-[#3D2817] rounded-full flex items-center justify-center shadow-lg">
          <svg
            className="w-14 h-14 text-[#D4A574]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
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
          <h1 className="text-5xl sm:text-6xl font-serif text-[#2C1810]">
            You&apos;re in.
          </h1>
          
          <h2 className="text-2xl sm:text-3xl font-serif text-[#2C1810]">
            Welcome to Backstreet Coffee Club.
          </h2>
          
          <p className="text-[#6B5D54] text-base leading-relaxed px-4 max-w-sm mx-auto">
            Your rewards journey starts now.
          </p>
        </div>

        {/* Done Button */}
        <button
          onClick={onDone}
          className="w-full max-w-sm bg-[#3D2817] hover:bg-[#2C1810] text-white font-medium py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          Done
        </button>

        {/* Footer */}
        <p className="text-[#B5A89C] text-xs tracking-widest uppercase mt-8">
          POWERED BY MENULOVE
        </p>
      </div>
    </div>
  )
}
