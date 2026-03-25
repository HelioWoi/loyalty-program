'use client'

import { useEffect, useState } from 'react'
import { useVenue } from '@/hooks/useVenue'
import { MemberData } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { fetchCampaign, getRewardsWithStatus, redeemReward, fetchRedemptionHistory, LoyaltyCampaign, RewardWithStatus, Redemption, getNextReward, getPointsToNextReward } from '@/lib/loyalty'

interface CheckIn {
  id: string
  checked_in_at: string
  venue: string
}

interface RewardsPageProps {
  member: MemberData
  venueId?: string
  onBack: () => void
  onClaimReward?: (updatedMember: MemberData) => void
}

export default function RewardsPage({ member, venueId, onBack, onClaimReward }: RewardsPageProps) {
  const venue = useVenue(venueId)
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [liveMember, setLiveMember] = useState(member)
  const [visibleCount, setVisibleCount] = useState(5)
  const [campaign, setCampaign] = useState<LoyaltyCampaign | null>(null)
  const [rewardStatuses, setRewardStatuses] = useState<RewardWithStatus[]>([])
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [popupReward, setPopupReward] = useState<RewardWithStatus | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState(false)

  useEffect(() => {
    fetchFreshData()
    loadCheckIns()
    loadRedemptions()
  }, [member.id])

  const loadRedemptions = async () => {
    const data = await fetchRedemptionHistory(member.id)
    setRedemptions(data)
  }

  const fetchFreshData = async () => {
    const { data, error } = await supabase
      .from('coffee_club_members')
      .select('*')
      .eq('id', member.id)
      .single()

    let freshPoints = member.points || 0
    if (!error && data) {
      freshPoints = data.points || 0
      setLiveMember({
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        visits_count: data.visits_count || 0,
        reward_status: data.reward_status || 'new',
        points: freshPoints,
      })
    }

    // Load campaign + reward statuses
    const camp = await fetchCampaign()
    setCampaign(camp)
    const statuses = await getRewardsWithStatus(member.id, freshPoints, camp.id)
    setRewardStatuses(statuses)
  }

  const openRedeemPopup = (reward: RewardWithStatus) => {
    setPopupReward(reward)
  }

  const handleConfirmRedeem = async () => {
    if (!popupReward) return
    setIsConfirming(true)
    setRedeemingId(popupReward.id)

    const result = await redeemReward(member.id, popupReward.id)
    let updatedMember = liveMember
    if (result.success) {
      updatedMember = { ...liveMember, points: result.newPoints }
      setLiveMember(updatedMember)

      if (campaign?.id) {
        const statuses = await getRewardsWithStatus(member.id, result.newPoints, campaign.id)
        setRewardStatuses(statuses)
      }

      await loadRedemptions()
    }
    setRedeemingId(null)
    setIsConfirming(false)
    setRedeemSuccess(true)

    // Show 'Thank you' for 2.5s, then close and notify parent
    setTimeout(() => {
      setRedeemSuccess(false)
      setPopupReward(null)
      if (result.success && onClaimReward) {
        onClaimReward(updatedMember)
      }
    }, 2500)
  }

  const loadCheckIns = async () => {
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('id, checked_in_at, venue')
        .eq('member_id', member.id)
        .order('checked_in_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error loading check-ins:', error)
      } else {
        setRecentCheckIns(data || [])
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const memberPoints = liveMember.points || 0
  const maxPoints = rewardStatuses.length > 0 ? Math.max(...rewardStatuses.map(r => r.points_required)) : 150
  const progress = Math.min((memberPoints / maxPoints) * 100, 100)
  const nextReward = getNextReward(memberPoints, rewardStatuses)
  const pointsToNext = getPointsToNextReward(memberPoints, rewardStatuses)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    const day = date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    const time = date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })

    let relative = ''
    if (diffDays === 0) relative = 'Today'
    else if (diffDays === 1) relative = 'Yesterday'
    else if (diffDays < 7) relative = `${diffDays} days ago`

    return { day, time, relative }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unlocked': return '#10b981'
      case 'redeemed': return venue.colors.textMuted
      default: return venue.colors.textMuted
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'unlocked': return 'Available'
      case 'redeemed': return 'Redeemed'
      default: return 'Locked'
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-8" style={{ backgroundColor: venue.colors.background }}>
      <div className="w-full max-w-md space-y-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 transition-colors"
          style={{ color: venue.colors.textLight }}
          onMouseEnter={(e) => e.currentTarget.style.color = venue.colors.text}
          onMouseLeave={(e) => e.currentTarget.style.color = venue.colors.textLight}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Logo - only show if uploaded */}
        {campaign?.logo_url && (
          <div className="flex justify-center">
            <div className="w-20 h-20 flex items-center justify-center">
              <img 
                src={campaign.logo_url} 
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif" style={{ color: venue.colors.text }}>
            Your Rewards
          </h1>
          <p className="text-base" style={{ color: venue.colors.textLight }}>
            {member.full_name}
          </p>
        </div>

        {/* Points Balance Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium" style={{ color: venue.colors.textLight }}>
              Points Balance
            </span>
            <span className="text-3xl font-serif font-bold" style={{ color: venue.colors.accent }}>
              {memberPoints}
            </span>
          </div>

          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500 rounded-full"
              style={{ 
                width: `${progress}%`,
                backgroundColor: venue.colors.accent
              }}
            />
          </div>

          {nextReward && pointsToNext > 0 ? (
            <p className="text-sm text-center" style={{ color: venue.colors.textLight }}>
              {pointsToNext} points to <span className="font-medium">{nextReward.name}</span>
            </p>
          ) : (
            <p className="text-sm text-center font-medium" style={{ color: '#10b981' }}>
              All rewards unlocked!
            </p>
          )}
        </div>

        {/* Reward Tiers */}
        <div className="space-y-3">
          <h2 className="text-lg font-serif" style={{ color: venue.colors.text }}>
            Reward Tiers
          </h2>
          {rewardStatuses.map((reward) => (
            <div
              key={reward.id}
              className="bg-white rounded-xl p-4 shadow flex items-center gap-4 transition-all"
              style={{
                opacity: reward.memberStatus === 'redeemed' ? 0.6 : 1,
                borderLeft: `4px solid ${getStatusColor(reward.memberStatus)}`,
              }}
            >
              {/* Points Circle */}
              <div
                className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: reward.memberStatus === 'unlocked' ? '#10b981' : reward.memberStatus === 'redeemed' ? venue.colors.textMuted : venue.colors.background,
                  color: reward.memberStatus !== 'locked' ? 'white' : venue.colors.textMuted,
                }}
              >
                {reward.memberStatus === 'redeemed' ? '✓' : reward.points_required}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm" style={{ color: venue.colors.text, textDecoration: reward.memberStatus === 'redeemed' ? 'line-through' : 'none' }}>
                  {reward.name}
                </p>
                <p className="text-xs" style={{ color: venue.colors.textLight }}>
                  {reward.description}
                </p>
                <span
                  className="inline-block text-[10px] uppercase tracking-wide font-bold mt-1 px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: reward.memberStatus === 'unlocked' ? '#d1fae5' : reward.memberStatus === 'redeemed' ? '#f3f4f6' : venue.colors.background,
                    color: reward.memberStatus === 'unlocked' ? '#065f46' : reward.memberStatus === 'redeemed' ? '#6b7280' : venue.colors.textMuted,
                  }}
                >
                  {getStatusLabel(reward.memberStatus)}
                </span>
              </div>

              {/* Redeem Button */}
              {reward.memberStatus === 'unlocked' && (
                <button
                  onClick={() => openRedeemPopup(reward)}
                  className="flex-shrink-0 text-xs font-medium px-3 py-2 rounded-lg text-white transition-all"
                  style={{ backgroundColor: '#10b981' }}
                >
                  Redeem
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Redemption History */}
        {redemptions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-serif" style={{ color: venue.colors.text }}>
              Rewards Redeemed
            </h2>
            <div className="space-y-2">
              {redemptions.map((r) => {
                const { day, time } = formatDate(r.redeemed_at)
                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-xl p-4 flex justify-between items-center shadow"
                  >
                    <div>
                      <p className="font-medium text-sm" style={{ color: venue.colors.text }}>
                        {r.reward_name}
                      </p>
                      <p className="text-xs" style={{ color: venue.colors.textLight }}>
                        {day} · {time}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                      -{r.points_spent} pts
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Check-ins */}
        <div className="space-y-3">
          <h2 className="text-lg font-serif" style={{ color: venue.colors.text }}>
            Recent Visits
          </h2>

          {isLoading ? (
            <div className="text-center py-8" style={{ color: venue.colors.textLight }}>
              <p>Loading...</p>
            </div>
          ) : recentCheckIns.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl" style={{ color: venue.colors.textLight }}>
              <p>No visits yet</p>
              <p className="text-sm mt-1">Check in to start earning rewards!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCheckIns.slice(0, visibleCount).map((checkIn) => {
                const { day, time, relative } = formatDate(checkIn.checked_in_at)
                return (
                  <div 
                    key={checkIn.id}
                    className="bg-white rounded-xl p-4 flex justify-between items-center shadow"
                  >
                    <div>
                      <p className="font-medium" style={{ color: venue.colors.text }}>
                        {checkIn.venue}
                      </p>
                      <p className="text-sm" style={{ color: venue.colors.textLight }}>
                        {day} · {time}
                      </p>
                      {relative && (
                        <p className="text-xs mt-0.5" style={{ color: venue.colors.textMuted }}>
                          {relative}
                        </p>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: venue.colors.accent }}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )
              })}
              {recentCheckIns.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount(prev => prev + 5)}
                  className="w-full py-3 text-sm font-medium rounded-xl transition-colors"
                  style={{ color: venue.colors.primary }}
                >
                  Show more ({recentCheckIns.length - visibleCount} remaining)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs tracking-wide text-center" style={{ color: venue.colors.textMuted }}>
          Powered by MenuLove™
        </p>
      </div>

      {/* Redeem Popup Modal */}
      {popupReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-5">
            {redeemSuccess ? (
              /* Thank You Screen */
              <>
                <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-serif font-bold" style={{ color: venue.colors.text }}>
                  Thank you!
                </h3>
                <p className="text-sm" style={{ color: venue.colors.textLight }}>
                  Your <strong>{popupReward.name}</strong> has been redeemed. Enjoy!
                </p>
              </>
            ) : (
              /* Confirm Screen - Staff must see this */
              <>
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: venue.colors.accent }}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-serif font-bold" style={{ color: venue.colors.text }}>
                    {popupReward.name}
                  </h3>
                  <p className="text-xs" style={{ color: venue.colors.textMuted }}>
                    {popupReward.points_required} points
                  </p>
                </div>

                <div className="p-5 rounded-2xl border-2 border-dashed space-y-2" style={{ borderColor: venue.colors.accent, backgroundColor: venue.colors.background }}>
                  <p className="text-base font-bold" style={{ color: venue.colors.text }}>
                    Please show this screen to the attendant before confirming
                  </p>
                  <p className="text-xs" style={{ color: venue.colors.textMuted }}>
                    The staff member will tap confirm to validate your reward
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPopupReward(null)}
                    className="flex-1 py-3 rounded-2xl font-medium text-sm border-2 transition-all"
                    style={{ borderColor: venue.colors.textMuted, color: venue.colors.textMuted }}
                    disabled={isConfirming}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRedeem}
                    disabled={isConfirming}
                    className="flex-1 py-3 rounded-2xl font-medium text-sm text-white transition-all disabled:opacity-50"
                    style={{ backgroundColor: '#10b981' }}
                  >
                    {isConfirming ? 'Processing...' : 'Staff Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
