import { supabase } from './supabase'

export interface LoyaltyCampaign {
  id: string
  venue_id: string
  campaign_name: string
  points_per_checkin: number
  active: boolean
  logo_url?: string | null
}

export interface LoyaltyReward {
  id: string
  campaign_id: string
  name: string
  points_required: number
  description: string
  active: boolean
  sort_order: number
}

export interface MemberReward {
  id: string
  member_id: string
  reward_id: string
  status: 'locked' | 'unlocked' | 'redeemed'
  unlocked_at: string | null
  redeemed_at: string | null
}

export interface RewardWithStatus extends LoyaltyReward {
  memberStatus: 'locked' | 'unlocked' | 'redeemed'
  unlocked_at?: string | null
  redeemed_at?: string | null
}

export interface Redemption {
  id: string
  member_id: string
  reward_id: string
  reward_name: string
  points_spent: number
  redeemed_at: string
}

// Default campaign config (fallback if DB not available)
export const DEFAULT_CAMPAIGN: LoyaltyCampaign = {
  id: '',
  venue_id: '',
  campaign_name: 'Loyalty Program',
  points_per_checkin: 5,
  active: true,
}

export const DEFAULT_REWARDS: LoyaltyReward[] = [
  { id: '1', campaign_id: '', name: 'Free Coffee', points_required: 50, description: 'Enjoy a free coffee on us', active: true, sort_order: 1 },
  { id: '2', campaign_id: '', name: 'Banana Bread Reward', points_required: 70, description: 'Unlock a delicious Banana Bread', active: true, sort_order: 2 },
  { id: '3', campaign_id: '', name: 'Signature Smash Reward', points_required: 100, description: 'Claim a free Signature Smash burger', active: true, sort_order: 3 },
  { id: '4', campaign_id: '', name: 'Burger + Coffee Combo', points_required: 150, description: 'Enjoy a Signature Smash and coffee combo', active: true, sort_order: 4 },
]

// Fetch campaign config
export async function fetchCampaign(venueId?: string): Promise<LoyaltyCampaign> {
  if (!venueId) {
    console.error('No venueId provided to fetchCampaign')
    return DEFAULT_CAMPAIGN
  }

  const { data, error } = await supabase
    .from('loyalty_campaigns')
    .select('*')
    .eq('venue_id', venueId)
    .eq('active', true)
    .single()

  if (error || !data) {
    console.error('Campaign fetch error:', error)
    return DEFAULT_CAMPAIGN
  }
  return data
}

// Fetch rewards for a campaign
export async function fetchRewards(campaignId: string): Promise<LoyaltyReward[]> {
  if (!campaignId) return DEFAULT_REWARDS

  const { data, error } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error || !data || data.length === 0) {
    console.log('Using default rewards')
    return DEFAULT_REWARDS
  }
  return data
}

// Fetch member's reward statuses
export async function fetchMemberRewards(memberId: string): Promise<MemberReward[]> {
  const { data, error } = await supabase
    .from('member_rewards')
    .select('*')
    .eq('member_id', memberId)

  if (error || !data) return []
  return data
}

// Get rewards with member status merged
export async function getRewardsWithStatus(
  memberId: string,
  memberPoints: number,
  campaignId: string
): Promise<RewardWithStatus[]> {
  const rewards = await fetchRewards(campaignId)
  const memberRewards = await fetchMemberRewards(memberId)

  return rewards.map(reward => {
    // Points are the source of truth: if you have enough, reward is available
    let status: 'locked' | 'unlocked' | 'redeemed' = 'locked'
    if (memberPoints >= reward.points_required) {
      status = 'unlocked'
    }

    const mr = memberRewards.find(m => m.reward_id === reward.id)

    return {
      ...reward,
      memberStatus: status,
      unlocked_at: mr?.unlocked_at || null,
      redeemed_at: mr?.redeemed_at || null,
    }
  })
}

// Check and unlock rewards after points update
export async function checkAndUnlockRewards(
  memberId: string,
  newPoints: number,
  campaignId: string
): Promise<RewardWithStatus[]> {
  const rewards = await fetchRewards(campaignId)
  const memberRewards = await fetchMemberRewards(memberId)

  for (const reward of rewards) {
    const existing = memberRewards.find(mr => mr.reward_id === reward.id)

    if (newPoints >= reward.points_required) {
      if (!existing) {
        // Create new unlocked reward
        await supabase.from('member_rewards').insert({
          member_id: memberId,
          reward_id: reward.id,
          status: 'unlocked',
          unlocked_at: new Date().toISOString(),
        })
      }
      // Don't change status if already redeemed
    }
  }

  // Return fresh data
  return getRewardsWithStatus(memberId, newPoints, campaignId)
}

// Redeem a reward: log to history, subtract points, clear member_rewards for recalculation
export async function redeemReward(memberId: string, rewardId: string): Promise<{ success: boolean; newPoints: number }> {
  // Fetch reward details
  const { data: reward } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('id', rewardId)
    .single()

  if (!reward) return { success: false, newPoints: 0 }

  const rewardCost = reward.points_required || 0

  // Fetch current member points
  const { data: memberData } = await supabase
    .from('coffee_club_members')
    .select('points')
    .eq('id', memberId)
    .single()

  const currentPoints = memberData?.points || 0
  const newPoints = Math.max(currentPoints - rewardCost, 0)

  // 1. Log redemption to permanent history
  const { error: logError } = await supabase
    .from('redemptions')
    .insert({
      member_id: memberId,
      reward_id: rewardId,
      reward_name: reward.name,
      points_spent: rewardCost,
    })

  if (logError) {
    console.error('Failed to log redemption:', logError)
    return { success: false, newPoints: currentPoints }
  }

  // 2. Subtract points
  await supabase
    .from('coffee_club_members')
    .update({ points: newPoints })
    .eq('id', memberId)

  // 3. Delete ALL member_rewards for this member (will be recalculated based on new points)
  await supabase
    .from('member_rewards')
    .delete()
    .eq('member_id', memberId)

  return { success: true, newPoints }
}

// Fetch redemption history for a member
export async function fetchRedemptionHistory(memberId: string): Promise<Redemption[]> {
  const { data, error } = await supabase
    .from('redemptions')
    .select('*')
    .eq('member_id', memberId)
    .order('redeemed_at', { ascending: false })

  if (error || !data) return []
  return data
}

// Fetch all redemptions (for admin dashboard)
export async function fetchAllRedemptions(): Promise<Redemption[]> {
  const { data, error } = await supabase
    .from('redemptions')
    .select('*')
    .order('redeemed_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return data
}

// Get next reward target for a member
export function getNextReward(points: number, rewards: LoyaltyReward[]): LoyaltyReward | null {
  const sorted = [...rewards].sort((a, b) => a.points_required - b.points_required)
  return sorted.find(r => r.points_required > points) || null
}

// Get points needed for next reward
export function getPointsToNextReward(points: number, rewards: LoyaltyReward[]): number {
  const next = getNextReward(points, rewards)
  if (!next) return 0
  return next.points_required - points
}
