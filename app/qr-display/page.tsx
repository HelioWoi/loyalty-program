'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getVenueFromHostname } from '@/lib/venues'
import { fetchCampaign, fetchRewards, LoyaltyCampaign, LoyaltyReward } from '@/lib/loyalty'

export default function QRDisplayPage() {
  const [qrUrl, setQrUrl] = useState('')
  const [venue, setVenue] = useState<any>(null)
  const [campaign, setCampaign] = useState<LoyaltyCampaign | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const venueConfig = getVenueFromHostname(hostname)
      setVenue(venueConfig)

      // Load campaign and rewards
      const loadData = async () => {
        const camp = await fetchCampaign()
        setCampaign(camp)
        const rews = await fetchRewards(camp.id)
        setRewards(rews)
      }
      loadData()

      // Generate time-based token (changes every hour)
      const updateQRCode = () => {
        const currentHour = new Date().toISOString().slice(0, 13)
        const token = btoa(currentHour + venueConfig.id).slice(0, 16)
        const baseUrl = window.location.origin
        const url = `${baseUrl}/?action=checkin&token=${token}`
        setQrUrl(url)
      }

      updateQRCode()
      const interval = setInterval(updateQRCode, 60000)

      return () => clearInterval(interval)
    }
  }, [])

  if (!venue || !qrUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: venue?.colors?.background || '#f5f5f0' }}>
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8" style={{ backgroundColor: venue.colors.background }}>
      <div className="flex flex-col items-center justify-center max-w-md w-full text-center space-y-5">
        {/* Logo */}
        {(campaign?.logo_url || venue.logo) ? (
          <div className="w-24 h-24 flex items-center justify-center">
            <img 
              src={campaign?.logo_url || venue.logo} 
              alt={venue.brand}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: venue.colors.primary }}>
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" style={{ color: venue.colors.accent }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h15M8 3v3m4-3v3M5 6h12a2 2 0 012 2v10a4 4 0 01-4 4H7a4 4 0 01-4-4V8a2 2 0 012-2zm14 4h1a2 2 0 012 2v2a2 2 0 01-2 2h-1" />
            </svg>
          </div>
        )}

        {/* Title */}
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-[0.2em] uppercase" style={{ color: venue.colors.accent }}>
            {campaign?.campaign_name || 'BACKSTREET POINTS CLUB'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif leading-tight" style={{ color: venue.colors.text }}>
            Your {venue.brand.split(' ')[0]}
          </h1>
          <h2 className="text-3xl sm:text-4xl font-serif italic" style={{ color: venue.colors.text }}>
            Rewards
          </h2>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed max-w-sm" style={{ color: venue.colors.textLight }}>
          Scan, collect points, and unlock exclusive rewards.
        </p>

        {/* Rewards Strip */}
        {rewards.length > 0 && (
          <div className="w-full flex flex-wrap justify-center gap-2">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="rounded-xl p-3 sm:p-3 text-center shadow bg-white"
                style={{ 
                  width: 'calc(50% - 4px)', // Mobile: 2 columns (2x2 grid)
                }}
              >
                <p className="text-lg sm:text-lg font-bold" style={{ color: venue.colors.accent }}>{reward.points_required}</p>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wide font-medium" style={{ color: venue.colors.textMuted }}>PTS</p>
                <p className="text-xs sm:text-xs font-medium mt-1 leading-tight" style={{ color: venue.colors.text }}>{reward.name}</p>
              </div>
            ))}
          </div>
        )}

        {/* QR Code */}
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-white rounded-2xl shadow-lg">
            <QRCodeSVG 
              value={qrUrl}
              size={200}
              level="H"
              includeMargin={false}
              fgColor={venue.colors.primary}
            />
          </div>
          <p className="text-xs" style={{ color: venue.colors.textLight }}>
            Every check-in = {campaign?.points_per_checkin || 5} points. The more you visit, the more you unlock.
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs tracking-wide mt-4" style={{ color: venue.colors.textMuted }}>
          Powered by MenuLove™
        </p>
      </div>
    </div>
  )
}
