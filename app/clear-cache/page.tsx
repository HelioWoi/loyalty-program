'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClearCachePage() {
  const [cleared, setCleared] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Clear all storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear any cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })
    
    setCleared(true)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#f5f5f0' }}>
      <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full text-center">
        {cleared ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif mb-2" style={{ color: '#2d2d2d' }}>
              Cache Cleared!
            </h1>
            <p className="text-sm mb-6" style={{ color: '#8b8680' }}>
              All local data has been removed. You can now start fresh.
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-xl text-white font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: '#c8a882' }}
            >
              Go to Home
            </button>
          </>
        ) : (
          <>
            <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full mx-auto mb-4"></div>
            <p className="text-sm" style={{ color: '#8b8680' }}>
              Clearing cache...
            </p>
          </>
        )}
      </div>
    </div>
  )
}
