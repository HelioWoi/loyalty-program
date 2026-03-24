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
  onCheckInSuccess: (updatedMember: MemberData) => void
  onViewRewards: () => void
}

export default function CheckInPage({ member, venueId, onCheckInSuccess, onViewRewards }: CheckInPageProps) {
  const venue = useVenue(venueId)
  const { playNotification } = useNotificationSound()
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveMember, setLiveMember] = useState<MemberData>(member)

  const [campaign, setCampaign] = useState<LoyaltyCampaign | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [memberRewards, setMemberRewards] = useState<RewardWithStatus[]>([])

  // Fetch fresh data and auto check-in on mount
  useEffect(() => {
    const initAndCheckIn = async () => {
      const { data, error } = await supabase
        .from('coffee_club_members')
        .select('*')
        .eq('id', member.id)
        .single()

      if (!error && data) {
        const fresh: MemberData = {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          visits_count: data.visits_count || 0,
          reward_status: data.reward_status || 'new',
          points: data.points || 0,
        }
        setLiveMember(fresh)
        console.log('Fresh member data:', fresh)
      }

      // Load campaign + rewards
      const camp = await fetchCampaign()
      setCampaign(camp)
      const rews = await fetchRewards(camp.id)
      setRewards(rews)

      // Auto check-in immediately with fresh data
      if (!hasCheckedIn) {
        const freshMember = (!error && data) ? {
          id: data.id, email: data.email, full_name: data.full_name,
          visits_count: data.visits_count || 0, reward_status: data.reward_status || 'new', points: data.points || 0,
        } : member
        handleCheckInAuto(camp, freshMember)
      }
    }
    initAndCheckIn()
  }, [member.id])

  const handleCheckInAuto = async (camp: LoyaltyCampaign | null, currentMember: MemberData) => {
    if (hasCheckedIn) return
    setIsCheckingIn(true)
    setError(null)

    try {
      const pointsToAdd = camp?.points_per_checkin || 5

      // Insert check-in record
      console.log('Inserting check-in for member:', member.id)
      const { error: checkInError } = await supabase
        .from('check_ins')
        .insert([{
          member_id: member.id,
          venue: venue.name,
        }])

      if (checkInError) {
        console.error('Check-in error:', JSON.stringify(checkInError, null, 2))
        setError('Failed to check in. Please try again.')
        setIsCheckingIn(false)
        return
      }

      // Update visits + points using fresh data (not stale state)
      const newVisits = currentMember.visits_count + 1
      const newPoints = (currentMember.points || 0) + pointsToAdd
      const newStatus = newVisits >= 1 ? 'active' : 'new'

      console.log('Updating points to:', newPoints, '(+', pointsToAdd, ')')
      const { error: updateError } = await supabase
        .from('coffee_club_members')
        .update({ visits_count: newVisits, reward_status: newStatus, points: newPoints })
        .eq('id', member.id)

      if (updateError) {
        console.error('Update error:', JSON.stringify(updateError, null, 2))
      }

      // Check and unlock rewards
      const campId = camp?.id || campaign?.id
      if (campId) {
        const updatedRewards = await checkAndUnlockRewards(member.id, newPoints, campId)
        setMemberRewards(updatedRewards)
      }

      // Play success sound
      playNotification()

      // Update member state
      const updatedMember: MemberData = {
        id: member.id,
        email: member.email,
        full_name: member.full_name,
        visits_count: newVisits,
        reward_status: newStatus,
        points: newPoints,
      }

      console.log('Check-in complete! Updated member:', updatedMember)
      setLiveMember(updatedMember)
      setHasCheckedIn(true)
      onCheckInSuccess(updatedMember)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
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
          ) : (campaign?.logo_url || venue.logo) ? (
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

        {/* Footer */}
        <p className="text-xs tracking-wide text-center mt-8" style={{ color: venue.colors.textMuted }}>
          Powered by MenuLove™
        </p>
      </div>
    </div>
  )
}
