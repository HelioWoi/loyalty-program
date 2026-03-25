'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useVenue } from '@/hooks/useVenue'
import { fetchCampaign, fetchRewards, LoyaltyCampaign, LoyaltyReward } from '@/lib/loyalty'
import { supabase } from '@/lib/supabase'

interface LandingPageProps {
  venueId?: string
}

export default function LandingPage({ venueId }: LandingPageProps) {
  const venue = useVenue(venueId)
  const [qrUrl, setQrUrl] = useState('')
  const [campaign, setCampaign] = useState<LoyaltyCampaign | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Generate secure QR code with token
      const updateQRCode = () => {
        const currentHour = new Date().toISOString().slice(0, 13)
        const token = btoa(currentHour + venue.id).slice(0, 16)
        const baseUrl = window.location.origin
        const url = `${baseUrl}/?action=checkin&token=${token}`
        setQrUrl(url)
      }
      
      updateQRCode()
      const interval = setInterval(updateQRCode, 60000)
      
      loadCampaignData()
      
      return () => clearInterval(interval)
    }
  }, [venue.id])

  const loadCampaignData = async () => {
    // If no venueId provided, fetch from database
    let actualVenueId = venueId
    if (!actualVenueId || actualVenueId === 'backstreet-cafe') {
      // Fetch first active venue from database
      const { data: venueData } = await supabase
        .from('venues')
        .select('id')
        .eq('active', true)
        .limit(1)
        .single()
      
      if (venueData) {
        actualVenueId = venueData.id
      }
    }

    const camp = await fetchCampaign(actualVenueId)
    setCampaign(camp)
    
    if (camp.id) {
      const rews = await fetchRewards(camp.id)
      setRewards(rews)
    }
  }

  
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 pt-8 sm:pt-12" style={{ backgroundColor: venue.colors.background }}>
      <div className="flex flex-col items-center justify-center max-w-md w-full text-center space-y-5">
        {/* Logo - only show if uploaded */}
        {campaign?.logo_url && (
          <div className="w-24 h-24 flex items-center justify-center">
            <img 
              src={campaign.logo_url} 
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Title Section */}
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-[0.2em] uppercase" style={{ color: venue.colors.accent }}>
            {campaign?.campaign_name || 'LOYALTY PROGRAM'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif leading-tight" style={{ color: venue.colors.text }}>
            Your {campaign?.campaign_name ? campaign.campaign_name.replace(' POINTS CLUB', '') : venue.brand}
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


        {/* Footer */}
        <p className="text-xs tracking-wide mt-4" style={{ color: venue.colors.textMuted }}>
          Powered by MenuLove™
        </p>
      </div>
    </div>
  )
}
