'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useVenue } from '@/hooks/useVenue'
import { fetchCampaign, fetchRewards, LoyaltyCampaign, LoyaltyReward } from '@/lib/loyalty'

interface LandingPageProps {
  venueId?: string
}

export default function LandingPage({ venueId }: LandingPageProps) {
  const venue = useVenue(venueId)
  const [currentUrl, setCurrentUrl] = useState('')
  const [campaign, setCampaign] = useState<LoyaltyCampaign | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
    loadCampaignData()
  }, [])

  const loadCampaignData = async () => {
    const camp = await fetchCampaign(venueId)
    setCampaign(camp)
    const rews = await fetchRewards(camp.id)
    setRewards(rews)
  }

  
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 pt-8 sm:pt-12" style={{ backgroundColor: venue.colors.background }}>
      <div className="flex flex-col items-center justify-center max-w-md w-full text-center space-y-5">
        {/* Logo or Coffee Icon */}
        {(campaign?.logo_url || venue.logo) ? (
          <div className="w-24 h-24 flex items-center justify-center">
            <img 
              src={campaign?.logo_url || venue.logo} 
              alt={venue.brand}
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error('Logo failed to load:', campaign?.logo_url || venue.logo)
                e.currentTarget.style.display = 'none'
              }}
              onLoad={() => console.log('Logo loaded successfully:', campaign?.logo_url || venue.logo)}
            />
          </div>
        ) : (
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
        )}

        {/* Title Section */}
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-[0.2em] uppercase" style={{ color: venue.colors.accent }}>
            {campaign?.campaign_name || 'BACKSTREET POINTS CLUB'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif leading-tight" style={{ color: venue.colors.text }}>
            Your Backstreet
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
                className="rounded-xl p-2 sm:p-3 text-center shadow bg-white"
                style={{ width: rewards.length >= 4 ? 'calc(25% - 6px)' : rewards.length === 3 ? 'calc(30% - 6px)' : rewards.length === 2 ? 'calc(40% - 6px)' : '50%' }}
              >
                <p className="text-base sm:text-lg font-bold" style={{ color: venue.colors.accent }}>{reward.points_required}</p>
                <p className="text-[8px] sm:text-[10px] uppercase tracking-wide font-medium" style={{ color: venue.colors.textMuted }}>Pts</p>
                <p className="text-[10px] sm:text-xs font-medium mt-0.5 leading-tight" style={{ color: venue.colors.text }}>{reward.name}</p>
              </div>
            ))}
          </div>
        )}

        {/* QR Code */}
        {currentUrl && (
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-white rounded-2xl shadow-lg">
              <QRCodeSVG 
                value={`${currentUrl.split('?')[0]}?action=checkin`}
                size={140}
                level="H"
                includeMargin={false}
                fgColor={venue.colors.primary}
              />
            </div>
            <p className="text-xs" style={{ color: venue.colors.textLight }}>
              Every check-in = {campaign?.points_per_checkin || 5} points. The more you visit, the more you unlock.
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs tracking-wide mt-4" style={{ color: venue.colors.textMuted }}>
          Powered by MenuLove™
        </p>
      </div>
    </div>
  )
}
