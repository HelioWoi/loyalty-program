'use client'

import { useState, useEffect } from 'react'
import { useVenue } from '@/hooks/useVenue'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { MemberData } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { fetchCampaign, fetchRewards, checkAndUnlockRewards, LoyaltyCampaign, LoyaltyReward, RewardWithStatus, getNextReward, getPointsToNextReward } from '@/lib/loyalty'

interface CheckInPageProps {
  member: MemberData
  venueId?: string
  qrToken: string | null
  onCheckInSuccess: (updatedMember: MemberData) => void
  onViewRewards: () => void
}

export default function CheckInPage({ member, venueId, qrToken, onCheckInSuccess, onViewRewards }: CheckInPageProps) {
  const venue = useVenue(venueId)
  const { playNotification } = useNotificationSound()
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveMember, setLiveMember] = useState<MemberData>(member)

  const [campaign, setCampaign] = useState<LoyaltyCampaign | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [memberRewards, setMemberRewards] = useState<RewardWithStatus[]>([])

  // Fetch fresh data and check-in ONLY if valid QR token exists
  useEffect(() => {
    const initData = async () => {
      let freshMember = member
      
      const { data, error } = await supabase
        .from('coffee_club_members')
        .select('*')
        .eq('id', member.id)
        .single()

      if (!error && data) {
        freshMember = {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          visits_count: data.visits_count || 0,
          reward_status: data.reward_status || 'new',
          points: data.points || 0,
        }
        setLiveMember(freshMember)
        console.log('Fresh member data:', freshMember)
      }

      // Load campaign + rewards - resolve venueId from database if needed
      let resolvedVenueId = venueId
      if (!resolvedVenueId || resolvedVenueId === 'backstreet-cafe') {
        const { data: vData } = await supabase
          .from('venues')
          .select('id')
          .eq('active', true)
          .limit(1)
          .single()
        if (vData) resolvedVenueId = vData.id
      }
      const camp = await fetchCampaign(resolvedVenueId)
      setCampaign(camp)
      const rews = await fetchRewards(camp.id)
      setRewards(rews)

      // ONLY check-in if valid QR token exists and user hasn't checked in yet
      if (qrToken && !hasCheckedIn) {
        await handleSecureCheckIn(camp, freshMember)
      }
    }
    initData()
  }, [member.id, qrToken])

  const handleSecureCheckIn = async (camp: LoyaltyCampaign | null, currentMember: MemberData) => {
    if (hasCheckedIn) return
    
    // Check if already checked in today (cooldown validation)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todayCheckIns } = await supabase
      .from('check_ins')
      .select('*')
      .eq('member_id', currentMember.id)
      .gte('checked_in_at', today.toISOString())
    
    if (todayCheckIns && todayCheckIns.length > 0) {
      setError('You already checked in today! Come back tomorrow for more points.')
      setHasCheckedIn(true)
      return
    }

    // Proceed with check-in
    setIsCheckingIn(true)
    setError(null)

    try {
      const pointsToAdd = camp?.points_per_checkin || 5
      const newVisits = currentMember.visits_count + 1
      const newPoints = (currentMember.points || 0) + pointsToAdd

      // Insert check-in record
      const { error: checkInError } = await supabase
        .from('check_ins')
        .insert({
          member_id: currentMember.id,
          venue_id: venueId,
        })

      if (checkInError) throw checkInError

      // Update member points and visits
      const { error: updateError } = await supabase
        .from('coffee_club_members')
        .update({
          points: newPoints,
          visits_count: newVisits,
          last_check_in: new Date().toISOString(),
        })
        .eq('id', currentMember.id)

      if (updateError) throw updateError

      const updatedMember: MemberData = {
        ...currentMember,
        points: newPoints,
        visits_count: newVisits,
      }

      setLiveMember(updatedMember)
      setHasCheckedIn(true)
      playNotification()

      // Check and unlock rewards
      if (camp) {
        await checkAndUnlockRewards(currentMember.id, newPoints, camp.id)
        const statuses = await fetchRewards(camp.id)
        setRewards(statuses)
      }

      onCheckInSuccess(updatedMember)
    } catch (err: any) {
      console.error('Check-in error:', err)
      // Check if it's a duplicate check-in error (unique constraint violation)
      if (err?.code === '23505' || err?.message?.includes('duplicate')) {
        setError('You already checked in today! Come back tomorrow for more points.')
        setHasCheckedIn(true)
      } else {
        setError('Failed to check in. Please try again.')
      }
    } finally {
      setIsCheckingIn(false)
    }
  }


  const memberPoints = liveMember.points || 0
  const maxPoints = rewards.length > 0 ? Math.max(...rewards.map(r => r.points_required)) : 150
  const progress = Math.min((memberPoints / maxPoints) * 100, 100)
  const nextReward = getNextReward(memberPoints, rewards)
  const pointsToNext = getPointsToNextReward(memberPoints, rewards)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-8" style={{ backgroundColor: venue.colors.background }}>
      <div className="w-full max-w-md space-y-8">
        {/* Logo or Green Checkmark after check-in */}
        <div className="flex justify-center">
          {hasCheckedIn ? (
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#10b981' }}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : campaign?.logo_url && (
            <div className="w-24 h-24 flex items-center justify-center">
              <img 
                src={campaign.logo_url} 
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>

        {/* Welcome Message */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif" style={{ color: venue.colors.text }}>
            Welcome back,
          </h1>
          <p className="text-2xl font-serif" style={{ color: venue.colors.accent }}>
            {member.full_name.split(' ')[0]}!
          </p>
        </div>

        {/* Points Balance */}
        <div className="bg-white rounded-2xl p-5 shadow-lg text-center space-y-1">
          <p className="text-4xl font-serif font-bold" style={{ color: venue.colors.accent }}>{memberPoints}</p>
          <p className="text-xs uppercase tracking-wide font-medium" style={{ color: venue.colors.textMuted }}>Points</p>
          {nextReward && pointsToNext > 0 ? (
            <p className="text-sm" style={{ color: venue.colors.textLight }}>
              {pointsToNext} points to <span className="font-medium">{nextReward.name}</span>
            </p>
          ) : nextReward === null && memberPoints > 0 ? (
            <p className="text-sm font-medium" style={{ color: '#10b981' }}>
              All rewards unlocked!
            </p>
          ) : null}
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="w-full h-3 bg-white rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full transition-all duration-500 rounded-full"
              style={{ 
                width: `${progress}%`,
                backgroundColor: venue.colors.accent
              }}
            />
          </div>

          {/* Reward Milestones */}
          {rewards.length > 0 && (
            <div className="flex justify-between">
              {rewards.map((reward) => {
                const isReached = memberPoints >= reward.points_required
                return (
                  <div key={reward.id} className="flex flex-col items-center">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        backgroundColor: isReached ? venue.colors.accent : 'white',
                        color: isReached ? 'white' : venue.colors.textMuted,
                        border: `2px solid ${isReached ? venue.colors.accent : venue.colors.textMuted}`
                      }}
                    >
                      {isReached ? '✓' : reward.points_required}
                    </div>
                    <p className="text-[9px] mt-1 text-center max-w-[60px] leading-tight" style={{ color: venue.colors.textMuted }}>
                      {reward.name}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: '#ef4444', color: 'white' }}>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Check-in status */}
        {isCheckingIn && (
          <p className="text-center text-sm" style={{ color: venue.colors.textLight }}>Checking in...</p>
        )}

        {/* Claim Reward button - only shows if a reward is available */}
        {!isCheckingIn && rewards.some(r => memberPoints >= r.points_required) && (
          <button
            onClick={onViewRewards}
            className="w-full text-white font-medium py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg"
            style={{ backgroundColor: '#10b981' }}
          >
            Claim Your Reward
          </button>
        )}

        {/* View Rewards Button */}
        <button
          onClick={onViewRewards}
          className="w-full font-medium py-3 px-8 rounded-2xl transition-all duration-300 border-2"
          style={{ 
            borderColor: venue.colors.primary,
            color: venue.colors.primary,
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = venue.colors.primary
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = venue.colors.primary
          }}
        >
          View My Rewards
        </button>

        {/* Logout button (discrete) */}
        <button
          onClick={() => {
            if (confirm('Clear your account data from this device?')) {
              localStorage.clear()
              sessionStorage.clear()
              window.location.href = '/'
            }
          }}
          className="text-xs underline opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: venue.colors.textMuted }}
        >
          Not you? Clear data
        </button>

        {/* Footer */}
        <p className="text-xs tracking-wide text-center mt-8" style={{ color: venue.colors.textMuted }}>
          Powered by MenuLove™
        </p>
      </div>
    </div>
  )
}
