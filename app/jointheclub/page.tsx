'use client'

import { useEffect } from 'react'

export default function JoinTheClubPage() {
  useEffect(() => {
    // Redirect to home page with signup screen and source=button, preserving subdomain
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin
      window.location.href = `${currentOrigin}/?screen=signup&source=button`
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EDE8E3]">
      <p className="text-gray-600">Redirecting...</p>
    </div>
  )
}
