'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { getVenueFromHostname } from '@/lib/venues'
import { fetchCampaign, fetchRewards, LoyaltyCampaign, LoyaltyReward } from '@/lib/loyalty'
import { supabase } from '@/lib/supabase'

export default function QRDisplayPage() {
  const router = useRouter()
  const [qrUrl, setQrUrl] = useState('')
  const [venue, setVenue] = useState<any>(null)
  const [campaign, setCampaign] = useState<LoyaltyCampaign | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const venueConfig = getVenueFromHostname(hostname)
      setVenue(venueConfig)

      const params = new URLSearchParams(window.location.search)
      const venueIdParam = params.get('venue')

      // Load campaign and rewards from database
      const loadData = async () => {
        let venueData: any = null

        if (venueIdParam) {
          // Load specific venue by ID (from admin preview)
          const { data } = await supabase
            .from('venues')
            .select('id, venue_name, logo_url, subdomain')
            .eq('id', venueIdParam)
            .single()
          venueData = data
        } else {
          // Try to load venue by subdomain from hostname
          const subdomain = hostname.split('.')[0]
          const { data: subdomainVenue } = await supabase
            .from('venues')
            .select('id, venue_name, logo_url, subdomain')
            .eq('subdomain', subdomain)
            .eq('active', true)
            .single()
          
          if (subdomainVenue) {
            venueData = subdomainVenue
          } else {
            // Fallback: load first active venue
            const { data: firstVenue } = await supabase
              .from('venues')
              .select('id, venue_name, logo_url, subdomain')
              .eq('active', true)
              .limit(1)
              .single()
            venueData = firstVenue
          }
        }

        if (venueData) {
          const camp = await fetchCampaign(venueData.id)
          setCampaign(camp)
          
          if (camp.id) {
            const rews = await fetchRewards(camp.id)
            // Only show active rewards configured by owner
            const activeRewards = rews.filter(r => r.active === true)
            setRewards(activeRewards)
          }

          // Generate time-based token (changes every hour)
          const updateQRCode = () => {
            const currentHour = new Date().toISOString().slice(0, 13)
            const token = btoa(currentHour + venueData.id).slice(0, 16)
            
            // Build URL with venue parameter for multi-tenant support
            const baseUrl = `${window.location.protocol}//${window.location.host}`
            const url = `${baseUrl}/?action=checkin&token=${token}&venue=${venueData.id}`
            setQrUrl(url)
          }

          updateQRCode()
          const interval = setInterval(updateQRCode, 60000)

          return () => clearInterval(interval)
        }
      }
      loadData()
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

        {/* Title */}
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-[0.2em] uppercase" style={{ color: venue.colors.accent }}>
            {campaign?.campaign_name || 'LOYALTY PROGRAM'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif leading-tight" style={{ color: venue.colors.text }}>
            Your {campaign?.campaign_name ? campaign.campaign_name.replace(' POINTS CLUB', '').trim() : 'Rewards'}
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
            Already registered? Scan QR code or click Join Us.
          </p>
        </div>

        {/* Join Us Button */}
        <button
          onClick={() => {
            // Use relative path to preserve subdomain
            const currentOrigin = window.location.origin
            window.location.href = `${currentOrigin}/jointheclub`
          }}
          className="w-full max-w-xs px-6 py-3 rounded-xl font-semibold text-base transition-all hover:opacity-90 shadow-lg"
          style={{ backgroundColor: venue.colors.primary, color: 'white' }}
        >
          Join Us
        </button>

        {/* Footer */}
        <p className="text-xs tracking-wide mt-4" style={{ color: venue.colors.textMuted }}>
          Powered by MenuLove™
        </p>
      </div>
    </div>
  )
}
