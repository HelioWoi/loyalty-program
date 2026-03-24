'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getVenueFromHostname } from '@/lib/venues'

export default function QRDisplayPage() {
  const [qrUrl, setQrUrl] = useState('')
  const [venue, setVenue] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const venueConfig = getVenueFromHostname(hostname)
      setVenue(venueConfig)

      // Generate time-based token (changes every hour)
      const updateQRCode = () => {
        const currentHour = new Date().toISOString().slice(0, 13) // YYYY-MM-DDTHH
        const token = btoa(currentHour + venueConfig.id).slice(0, 16)
        const baseUrl = window.location.origin
        const url = `${baseUrl}/?action=checkin&token=${token}`
        setQrUrl(url)
      }

      updateQRCode()
      // Update QR code every minute to ensure it's always fresh
      const interval = setInterval(updateQRCode, 60000)

      return () => clearInterval(interval)
    }
  }, [])

  if (!venue || !qrUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: venue.colors.background }}>
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        {venue.logo && (
          <div className="flex justify-center">
            <img src={venue.logo} alt={venue.brand} className="w-32 h-32 object-contain" />
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-4xl font-serif font-bold" style={{ color: venue.colors.text }}>
            {venue.brand}
          </h1>
          <p className="text-xl" style={{ color: venue.colors.accent }}>
            Loyalty Rewards
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-white p-8 rounded-2xl inline-block">
          <QRCodeSVG 
            value={qrUrl} 
            size={320}
            level="H"
            includeMargin={true}
            fgColor={venue.colors.primary}
          />
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <p className="text-2xl font-semibold" style={{ color: venue.colors.text }}>
            Scan to Check In
          </p>
          <p className="text-lg" style={{ color: venue.colors.textLight }}>
            Earn points with every visit
          </p>
          <div className="pt-4 border-t" style={{ borderColor: venue.colors.textMuted }}>
            <p className="text-sm" style={{ color: venue.colors.textMuted }}>
              🔒 Secure QR Code • Updates every hour
            </p>
            <p className="text-xs mt-1" style={{ color: venue.colors.textMuted }}>
              One check-in per day per customer
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6">
          <p className="text-xs tracking-wide" style={{ color: venue.colors.textMuted }}>
            Powered by MenuLove™
          </p>
        </div>
      </div>
    </div>
  )
}
