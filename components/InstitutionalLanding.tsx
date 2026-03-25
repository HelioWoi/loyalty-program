'use client'

import Link from 'next/link'

export default function InstitutionalLanding() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background */}
      <div 
        className="relative h-screen flex flex-col items-center justify-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* MenuLove Logo - Positioned at top */}
        <div className="absolute top-12 left-0 right-0 text-center">
          <img 
            src="https://nuwmbaohgwuanvzotbef.supabase.co/storage/v1/object/public/media/logo%20menulove.png"
            alt="MenuLove"
            className="h-20 mx-auto"
          />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center text-white mt-8">

          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4 md:mb-6 leading-tight">
            Build Customer Loyalty.<br />Grow Your Business.
          </h1>
          <p className="text-sm md:text-xl mb-6 md:mb-8 text-gray-200 leading-relaxed">
            The simplest way to reward your customers and keep them coming back.
            <br />Perfect for cafes, restaurants, and retail stores.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/owner-signup"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-900 rounded-xl font-semibold text-base sm:text-lg hover:bg-gray-100 transition-all shadow-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="/owner-login"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-transparent border-2 border-white text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-white hover:text-gray-900 transition-all"
            >
              Owner Login
            </Link>
          </div>
          <p className="text-xs sm:text-sm mt-3 sm:mt-4 text-gray-300">14 days free • No credit card required</p>
        </div>

        {/* Footer at bottom of hero */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-white text-sm">
            Powered by MenuLove™ <span className="text-gray-300">Beta</span>
          </p>
        </div>
      </div>
    </div>
  )
}
