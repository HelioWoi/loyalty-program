'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getVenueFromHostname, VenueConfig } from '@/lib/venues'
import { useOwnerAuth } from '@/hooks/useOwnerAuth'

interface MemberRow {
  id: string
  full_name: string
  email: string
  visits_count: number
  reward_status: string
  points: number
  created_at: string
}

interface CampaignData {
  id: string
  campaign_name: string
  points_per_checkin: number
  venue_id: string
  logo_url?: string
}

interface RewardData {
  id: string
  campaign_id: string
  name: string
  points_required: number
  description: string
  active: boolean
  sort_order: number
}

interface CheckInRow {
  id: string
  member_id: string
  venue: string
  checked_in_at: string
}

interface HourlyData {
  hour: number
  count: number
}

interface DailyData {
  day: string
  count: number
}

interface RedemptionRow {
  id: string
  member_id: string
  reward_id: string
  reward_name: string
  points_spent: number
  redeemed_at: string
}

interface InsightAlert {
  type: 'revenue_at_risk' | 'conversion_opportunity' | 'inactive_members'
  title: string
  subtitle: string
  icon: string
  color: string
  bgColor: string
  members: MemberRow[]
  actionLabel: string
  defaultMessage: string
}

interface InsightModal {
  alert: InsightAlert
  message: string
  showList: boolean
  showPreview: boolean
  sending: boolean
  sent: boolean
}

export default function AdminDashboard() {
  const { owner, currentVenue, setCurrentVenue, venues, loading: authLoading, isAuthenticated, logout, requireAuth } = useOwnerAuth()
  const [venue, setVenue] = useState<VenueConfig | null>(null)

  // Helper to get venue colors safely
  const getVenueColors = () => {
    if (currentVenue?.brand_colors) {
      return currentVenue.brand_colors
    }
    // Fallback colors
    return {
      primary: '#3b82f6',
      secondary: '#6b7280',
      accent: '#3b82f6',
      background: '#f8fafc',
      text: '#111827',
      textLight: '#6b7280',
      textMuted: '#9ca3af'
    }
  }
  const [members, setMembers] = useState<MemberRow[]>([])
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity' | 'redemptions' | 'campaign' | 'account'>('overview')
  const [totalRewardsClaimed, setTotalRewardsClaimed] = useState(0)
  const [redemptionRows, setRedemptionRows] = useState<RedemptionRow[]>([])
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null)
  const [rewardsData, setRewardsData] = useState<RewardData[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [activityPage, setActivityPage] = useState(1)
  const [activitySearch, setActivitySearch] = useState('')
  const [redemptionPage, setRedemptionPage] = useState(1)
  const [memberPage, setMemberPage] = useState(1)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberToDelete, setMemberToDelete] = useState<MemberRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
  const [insightModal, setInsightModal] = useState<InsightModal | null>(null)
  const [showInvoices, setShowInvoices] = useState(false)
  const [showPaymentMethod, setShowPaymentMethod] = useState(false)
  const [isEditingAccount, setIsEditingAccount] = useState(false)
  const [editedOwner, setEditedOwner] = useState({ full_name: '', email: '', phone: '' })
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [newLocation, setNewLocation] = useState({ venue_name: '', subdomain: '' })
  const [isAddingLocation, setIsAddingLocation] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVenue(getVenueFromHostname(window.location.hostname))
    }
  }, [])

  useEffect(() => {
    // Require authentication after auth check completes
    if (!authLoading) {
      requireAuth()
    }
  }, [authLoading, requireAuth])

  useEffect(() => {
    // Load dashboard data when authenticated and venue is set
    if (isAuthenticated && currentVenue) {
      loadAdminData()
    }
  }, [isAuthenticated, currentVenue])

  const loadMembers = async () => {
    if (!currentVenue) return
    
    try {
      const { data: membersData } = await supabase
        .from('coffee_club_members')
        .select('*')
        .eq('venue', currentVenue.venue_name)
        .order('created_at', { ascending: false })

      if (membersData) setMembers(membersData)
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }

  const loadAdminData = async () => {
    if (!currentVenue) return
    
    setIsLoading(true)
    try {
      // Load members first (needed for check-in queries)
      const { data: membersData } = await supabase
        .from('coffee_club_members')
        .select('*')
        .eq('venue', currentVenue.venue_name)
        .order('created_at', { ascending: false })

      if (membersData) setMembers(membersData)
      
      const mIds = membersData?.map(m => m.id) || []
      
      // Load check-ins and campaign in parallel
      await Promise.all([
        loadCheckIns(mIds),
        loadCampaignData()
      ])
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCheckIns = async (memberIds?: string[]) => {
    if (!currentVenue) return
    
    try {
      // Load check-ins (last 30 days) for this venue's members
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Use passed IDs or fallback to current members state
      const ids = memberIds || members?.map(m => m.id) || []

      const { data: checkInsData } = await supabase
        .from('check_ins')
        .select('*')
        .in('member_id', ids.length > 0 ? ids : [''])
        .gte('checked_in_at', thirtyDaysAgo.toISOString())
        .order('checked_in_at', { ascending: false })

      if (checkInsData) {
        setCheckIns(checkInsData)
        processHourlyData(checkInsData)
        processDailyData(checkInsData)
      }

      // Load redemptions for this venue's members
      const { data: redemptionsData } = await supabase
        .from('redemptions')
        .select('*')
        .in('member_id', ids.length > 0 ? ids : [''])
        .order('redeemed_at', { ascending: false })
        .limit(100)

      if (redemptionsData) setRedemptionRows(redemptionsData)
      setTotalRewardsClaimed(redemptionsData?.length || 0)
    } catch (error) {
      console.error('Error loading check-ins:', error)
    }
  }

  const loadCampaignData = async () => {
    if (!currentVenue) return
    
    try {
      // Load campaign settings for this venue
      const { data: campData } = await supabase
        .from('loyalty_campaigns')
        .select('*')
        .eq('venue_id', currentVenue.id)
        .single()

      if (campData) {
        setCampaignData(campData)

        const { data: rewsData } = await supabase
          .from('loyalty_rewards')
          .select('*')
          .eq('campaign_id', campData.id)
          .order('sort_order', { ascending: true })

        if (rewsData) setRewardsData(rewsData)
      }
    } catch (error) {
      console.error('Error loading campaign data:', error)
    }
  }

  const processHourlyData = (data: CheckInRow[]) => {
    const hours: Record<number, number> = {}
    for (let i = 0; i < 24; i++) hours[i] = 0

    data.forEach(ci => {
      const hour = new Date(ci.checked_in_at).getHours()
      hours[hour] = (hours[hour] || 0) + 1
    })

    setHourlyData(
      Object.entries(hours).map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      }))
    )
  }

  const processDailyData = (data: CheckInRow[]) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const days: Record<string, number> = {}
    dayNames.forEach(d => (days[d] = 0))

    data.forEach(ci => {
      const dayIndex = new Date(ci.checked_in_at).getDay()
      days[dayNames[dayIndex]] = (days[dayNames[dayIndex]] || 0) + 1
    })

    setDailyData(
      dayNames.map(day => ({ day, count: days[day] }))
    )
  }

  const peakHour = hourlyData.reduce((max, h) => (h.count > max.count ? h : max), { hour: 0, count: 0 })
  const peakDay = dailyData.reduce((max, d) => (d.count > max.count ? d : max), { day: '-', count: 0 })
  const maxHourlyCount = Math.max(...hourlyData.map(h => h.count), 1)
  const maxDailyCount = Math.max(...dailyData.map(d => d.count), 1)

  const todayCheckIns = checkIns.filter(ci => {
    const today = new Date()
    const ciDate = new Date(ci.checked_in_at)
    return ciDate.toDateString() === today.toDateString()
  }).length

  const formatHour = (h: number) => {
    if (h === 0) return '12am'
    if (h < 12) return `${h}am`
    if (h === 12) return '12pm'
    return `${h - 12}pm`
  }

  if (!venue) return null

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f5f0' }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full mx-auto mb-4"></div>
          <p className="text-sm" style={{ color: '#8b8680' }}>Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect happens in useEffect via requireAuth, don't block render
  if (!isAuthenticated) {
    return null
  }

  // Dashboard
  return (
    <div className="min-h-screen" style={{ backgroundColor: venue.colors.background }}>
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 shadow-sm" style={{ backgroundColor: 'white' }}>
        <div className="max-w-6xl mx-auto">
          {/* Mobile Layout */}
          <div className="flex sm:hidden flex-col gap-3">
            <div className="flex items-center justify-center relative">
              <img 
                src="https://nuwmbaohgwuanvzotbef.supabase.co/storage/v1/object/public/media/logo%20menulove%20black.png"
                alt="MenuLove"
                className="h-10"
              />
              <button
                onClick={logout}
                className="absolute right-0 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: venue.colors.textLight }}
              >
                Logout
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentVenue?.logo_url && (
                  <img src={currentVenue.logo_url} alt={currentVenue.venue_name} className="w-8 h-8 object-contain" />
                )}
                <div>
                  <h1 className="text-sm font-serif font-bold" style={{ color: venue.colors.text }}>
                    {currentVenue?.venue_name || venue.brand}
                  </h1>
                  <p className="text-[10px]" style={{ color: venue.colors.textLight }}>Owner Dashboard</p>
                </div>
              </div>
              {venues.length > 1 && currentVenue && (
                <select
                  value={currentVenue.id}
                  onChange={(e) => {
                    const selected = venues.find(v => v.id === e.target.value)
                    if (selected) setCurrentVenue(selected)
                  }}
                  className="px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2"
                  style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                >
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.venue_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex justify-between items-center">
            <div className="flex items-center gap-6">
              <img 
                src="https://nuwmbaohgwuanvzotbef.supabase.co/storage/v1/object/public/media/logo%20menulove%20black.png"
                alt="MenuLove"
                className="h-8"
              />
              <div className="flex items-center gap-3">
                {currentVenue?.logo_url && (
                  <img src={currentVenue.logo_url} alt={currentVenue.venue_name} className="w-10 h-10 object-contain" />
                )}
                <div>
                  <h1 className="text-lg font-serif font-bold" style={{ color: venue.colors.text }}>
                    {currentVenue?.venue_name || venue.brand}
                  </h1>
                  <p className="text-xs" style={{ color: venue.colors.textLight }}>Owner Dashboard</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {venues.length > 1 && currentVenue && (
                <select
                  value={currentVenue.id}
                  onChange={(e) => {
                    const selected = venues.find(v => v.id === e.target.value)
                    if (selected) setCurrentVenue(selected)
                  }}
                  className="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                >
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.venue_name}
                    </option>
                  ))}
                </select>
              )}
              
              <button
                onClick={logout}
                className="text-sm px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: venue.colors.textLight }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['overview', 'members', 'activity', 'redemptions', 'campaign', 'account'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all capitalize whitespace-nowrap"
              style={{
                backgroundColor: activeTab === tab ? venue.colors.primary : 'white',
                color: activeTab === tab ? 'white' : venue.colors.text,
              }}
            >
              {tab === 'campaign' ? 'Campaign Settings' : tab === 'account' ? 'Account & Billing' : tab}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-20" style={{ color: venue.colors.textLight }}>
            <p className="text-lg">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl p-5 shadow">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Total Members</p>
                    <p className="text-3xl font-serif mt-1" style={{ color: venue.colors.text }}>{members.length}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Check-ins (30d)</p>
                    <p className="text-3xl font-serif mt-1" style={{ color: venue.colors.text }}>{checkIns.length}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Today</p>
                    <p className="text-3xl font-serif mt-1" style={{ color: venue.colors.accent }}>{todayCheckIns}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Rewards Redeemed</p>
                    <p className="text-3xl font-serif mt-1" style={{ color: '#10b981' }}>{totalRewardsClaimed}</p>
                  </div>
                </div>

                {/* Peak Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 shadow">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Peak Hour</p>
                    <p className="text-2xl font-serif mt-1" style={{ color: venue.colors.text }}>
                      {formatHour(peakHour.hour)}
                      <span className="text-sm font-normal ml-2" style={{ color: venue.colors.textLight }}>
                        ({peakHour.count} check-ins)
                      </span>
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Busiest Day</p>
                    <p className="text-2xl font-serif mt-1" style={{ color: venue.colors.text }}>
                      {peakDay.day}
                      <span className="text-sm font-normal ml-2" style={{ color: venue.colors.textLight }}>
                        ({peakDay.count} check-ins)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Hourly Chart */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow">
                  <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wide mb-4" style={{ color: venue.colors.textMuted }}>
                    Check-ins by Hour (Last 30 Days)
                  </h3>
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="relative min-w-[500px]">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between h-40 pointer-events-none">
                        {[0, 25, 50, 75, 100].map(percent => (
                          <div key={percent} className="w-full border-t" style={{ borderColor: '#f3f4f6' }} />
                        ))}
                      </div>
                      {/* Bars */}
                      <div className="flex items-end gap-1 h-40 relative">
                        {hourlyData.filter(h => h.hour >= 6 && h.hour <= 22).map(h => (
                          <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px]" style={{ color: venue.colors.textMuted }}>{h.count || ''}</span>
                            <div
                              className="w-full rounded-t transition-all"
                              style={{
                                height: `${Math.max((h.count / maxHourlyCount) * 100, 2)}%`,
                                backgroundColor: h.hour === peakHour.hour ? venue.colors.accent : venue.colors.textMuted,
                                opacity: h.hour === peakHour.hour ? 1 : 0.4,
                              }}
                            />
                            <span className="text-[10px]" style={{ color: venue.colors.textMuted }}>
                              {formatHour(h.hour)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Chart */}
                <div className="bg-white rounded-2xl p-6 shadow">
                  <h3 className="text-sm font-medium uppercase tracking-wide mb-4" style={{ color: venue.colors.textMuted }}>
                    Check-ins by Day of Week (Last 30 Days)
                  </h3>
                  <div className="relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between h-32 pointer-events-none">
                      {[0, 25, 50, 75, 100].map(percent => (
                        <div key={percent} className="w-full border-t" style={{ borderColor: '#f3f4f6' }} />
                      ))}
                    </div>
                    {/* Bars */}
                    <div className="flex items-end gap-2 h-32 relative">
                      {dailyData.map(d => (
                        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-medium" style={{ color: venue.colors.textLight }}>{d.count}</span>
                          <div
                            className="w-full rounded-t transition-all"
                            style={{
                              height: `${Math.max((d.count / maxDailyCount) * 100, 4)}%`,
                              backgroundColor: d.day === peakDay.day ? venue.colors.accent : venue.colors.textMuted,
                              opacity: d.day === peakDay.day ? 1 : 0.4,
                            }}
                          />
                          <span className="text-xs font-medium" style={{ color: venue.colors.textMuted }}>{d.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Customer Insights */}
                {(() => {
                  const now = new Date()
                  const activeRewards = rewardsData.filter(r => r.active)
                  const lowestReward = activeRewards.length > 0 ? Math.min(...activeRewards.map(r => r.points_required)) : 50

                  // Build last check-in map per member
                  const lastCheckinMap: Record<string, Date> = {}
                  checkIns.forEach(ci => {
                    const d = new Date(ci.checked_in_at)
                    if (!lastCheckinMap[ci.member_id] || d > lastCheckinMap[ci.member_id]) {
                      lastCheckinMap[ci.member_id] = d
                    }
                  })

                  // 1. Revenue at Risk: last visit 7-14 days ago, has prior visits
                  const atRiskMembers = members.filter(m => {
                    const last = lastCheckinMap[m.id]
                    if (!last || m.visits_count < 2) return false
                    const daysSince = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
                    return daysSince >= 7 && daysSince <= 14
                  })

                  // 2. Almost There: within 5-15 points of any active reward
                  const almostThereMembers = members.filter(m => {
                    if (!m.points || m.points <= 0) return false
                    return activeRewards.some(r => {
                      const gap = r.points_required - m.points
                      return gap > 0 && gap <= 15
                    })
                  })

                  // 3. Inactive: no check-in in 20+ days but has visited before
                  const inactiveMembers = members.filter(m => {
                    if (m.visits_count < 1) return false
                    const last = lastCheckinMap[m.id]
                    if (!last) return m.visits_count >= 1 // Has visits but none in last 30 days
                    const daysSince = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
                    return daysSince >= 20
                  })

                  const insights: InsightAlert[] = [
                    {
                      type: 'revenue_at_risk',
                      title: 'Revenue at Risk',
                      subtitle: 'Customers who may not return soon',
                      icon: '⚠️',
                      color: '#f59e0b',
                      bgColor: '#fffbeb',
                      members: atRiskMembers,
                      actionLabel: 'Send Comeback Offer',
                      defaultMessage: `Hi {name}! We miss you at ${venue.brand}. Come back and enjoy a free coffee on your next visit ☕`,
                    },
                    {
                      type: 'conversion_opportunity',
                      title: 'Almost There',
                      subtitle: 'Customers close to unlocking rewards',
                      icon: '🎯',
                      color: '#10b981',
                      bgColor: '#ecfdf5',
                      members: almostThereMembers,
                      actionLabel: 'Send Reminder',
                      defaultMessage: `Hi {name}! You're just a few points away from your next reward at ${venue.brand} 🎯 Visit us today!`,
                    },
                    {
                      type: 'inactive_members',
                      title: 'Inactive Members',
                      subtitle: "Customers who haven't visited in a while",
                      icon: '💤',
                      color: '#ef4444',
                      bgColor: '#fef2f2',
                      members: inactiveMembers,
                      actionLabel: 'Re-engage Campaign',
                      defaultMessage: `Hi {name}! We miss you at ${venue.brand}! Come back this week and enjoy a special reward on us 🎉`,
                    },
                  ]

                  const activeInsights = insights.filter(i => i.members.length > 0)

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>
                          Customer Insights
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: venue.colors.accent, color: '#fff' }}>
                          {activeInsights.length} alert{activeInsights.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {activeInsights.length === 0 ? (
                        <div className="bg-white rounded-2xl p-6 shadow text-center">
                          <p className="text-sm" style={{ color: venue.colors.textLight }}>
                            All clear! No customer alerts right now.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {insights.map(insight => (
                            <div
                              key={insight.type}
                              className="rounded-2xl p-5 shadow border-l-4 transition-all"
                              style={{ backgroundColor: insight.members.length > 0 ? insight.bgColor : '#f9fafb', borderLeftColor: insight.members.length > 0 ? insight.color : '#e5e7eb' }}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="text-sm font-bold" style={{ color: insight.members.length > 0 ? insight.color : '#9ca3af' }}>
                                    {insight.icon} {insight.title}
                                  </p>
                                  <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{insight.subtitle}</p>
                                </div>
                                <span className="text-2xl font-serif font-bold" style={{ color: insight.members.length > 0 ? insight.color : '#d1d5db' }}>
                                  {insight.members.length}
                                </span>
                              </div>
                              {insight.members.length > 0 ? (
                                <button
                                  onClick={() => setInsightModal({ alert: insight, message: insight.defaultMessage, showList: false, showPreview: false, sending: false, sent: false })}
                                  className="w-full py-2 rounded-xl text-xs font-medium text-white transition-all hover:opacity-90"
                                  style={{ backgroundColor: insight.color }}
                                >
                                  {insight.actionLabel}
                                </button>
                              ) : (
                                <p className="text-[11px] text-center py-2" style={{ color: '#9ca3af' }}>No customers match</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (() => {
              const MEMBERS_PER_PAGE = 15
              const filteredMembers = memberSearch
                ? members.filter(m => m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) || m.email?.toLowerCase().includes(memberSearch.toLowerCase()))
                : members
              const memberTotalPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE))
              const memberSlice = filteredMembers.slice((memberPage - 1) * MEMBERS_PER_PAGE, memberPage * MEMBERS_PER_PAGE)

              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="font-medium" style={{ color: venue.colors.text }}>
                      All Members ({filteredMembers.length})
                    </h3>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => { setMemberSearch(e.target.value); setMemberPage(1); setExpandedMemberId(null) }}
                        placeholder="Search name or email..."
                        className="px-3 py-2 rounded-lg border text-sm w-full sm:w-56 focus:outline-none focus:ring-2"
                        style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                      />
                      {memberSearch && (
                        <button onClick={() => { setMemberSearch(''); setMemberPage(1); setExpandedMemberId(null) }} className="text-xs whitespace-nowrap underline" style={{ color: venue.colors.textMuted }}>Clear</button>
                      )}
                      <button
                        onClick={() => {
                          const csv = [
                            ['Name', 'Email', 'Points', 'Visits', 'Status', 'Created At'].join(','),
                            ...filteredMembers.map(m => [
                              m.full_name,
                              m.email,
                              m.points || 0,
                              m.visits_count,
                              m.reward_status,
                              new Date(m.created_at).toLocaleDateString()
                            ].join(','))
                          ].join('\n')
                          const blob = new Blob([csv], { type: 'text/csv' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `members-${new Date().toISOString().split('T')[0]}.csv`
                          a.click()
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-gray-100"
                        style={{ color: venue.colors.textMuted }}
                        title="Download CSV"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: venue.colors.background }}>
                            <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Name</th>
                            <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide hidden sm:table-cell" style={{ color: venue.colors.textMuted }}>Email</th>
                            <th className="text-center px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Points</th>
                            <th className="text-center px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Visits</th>
                            <th className="text-right px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {memberSlice.map(m => {
                            const isExpanded = expandedMemberId === m.id
                            const memberCheckins = checkIns.filter(ci => ci.member_id === m.id)
                            const realVisits = Math.max(memberCheckins.length, m.visits_count || 0)
                            const memberRedemptions = redemptionRows.filter(r => r.member_id === m.id)
                            const lastCheckin = memberCheckins.length > 0 ? new Date(memberCheckins[0].checked_in_at) : null
                            return (
                              <React.Fragment key={m.id}>
                                <tr className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-2.5 text-sm font-medium" style={{ color: getVenueColors().text }}>{m.full_name}</td>
                                  <td className="px-4 py-2.5 text-xs hidden sm:table-cell" style={{ color: getVenueColors().textLight }}>{m.email}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: getVenueColors().accent }}>
                                      {m.points || 0}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-center" style={{ color: getVenueColors().textLight }}>{realVisits}</td>
                                  <td className="px-4 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => setExpandedMemberId(isExpanded ? null : m.id)}
                                        className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all hover:bg-gray-50 whitespace-nowrap"
                                        style={{ 
                                          borderColor: isExpanded ? getVenueColors().accent : '#e5e7eb', 
                                          color: isExpanded ? getVenueColors().accent : '#6b7280'
                                        }}
                                      >
                                        {isExpanded ? 'Close' : 'Details'}
                                      </button>
                                      <button
                                        onClick={() => setMemberToDelete(m)}
                                        className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all hover:bg-red-50 whitespace-nowrap"
                                        style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                        title="Delete member"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={5} className="px-4 pb-4 pt-1">
                                      <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: venue.colors.background }}>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                          <div>
                                            <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: venue.colors.textMuted }}>Total Points</p>
                                            <p className="text-lg font-serif" style={{ color: venue.colors.accent }}>{m.points || 0}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: venue.colors.textMuted }}>Total Check-ins</p>
                                            <p className="text-lg font-serif" style={{ color: venue.colors.text }}>{realVisits}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: venue.colors.textMuted }}>Rewards Redeemed</p>
                                            <p className="text-lg font-serif" style={{ color: '#10b981' }}>{memberRedemptions.length}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: venue.colors.textMuted }}>Member Since</p>
                                            <p className="text-sm font-medium" style={{ color: venue.colors.text }}>
                                              {new Date(m.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3 pt-1">
                                          <div className="flex-1">
                                            <p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: venue.colors.textMuted }}>Email</p>
                                            <p className="text-xs" style={{ color: venue.colors.text }}>{m.email}</p>
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: venue.colors.textMuted }}>Last Check-in</p>
                                            <p className="text-xs" style={{ color: venue.colors.text }}>
                                              {lastCheckin ? `${lastCheckin.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} at ${lastCheckin.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}` : 'No check-ins yet'}
                                            </p>
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: venue.colors.textMuted }}>Status</p>
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                              m.reward_status === 'rewarded' ? 'bg-green-100 text-green-700' :
                                              m.reward_status === 'active' ? 'bg-blue-100 text-blue-700' :
                                              'bg-gray-100 text-gray-600'
                                            }`}>
                                              {m.reward_status}
                                            </span>
                                          </div>
                                        </div>
                                        {memberRedemptions.length > 0 && (
                                          <div className="pt-1">
                                            <p className="text-[10px] uppercase tracking-wide font-medium mb-1.5" style={{ color: venue.colors.textMuted }}>Recent Redemptions</p>
                                            <div className="space-y-1">
                                              {memberRedemptions.slice(0, 3).map(r => (
                                                <div key={r.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5">
                                                  <span style={{ color: venue.colors.text }}>{r.reward_name}</span>
                                                  <span className="font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>-{r.points_spent} pts</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        <button
                                          onClick={() => {
                                            setActiveTab('activity')
                                            setActivitySearch(m.full_name)
                                            setActivityPage(1)
                                          }}
                                          className="text-[11px] font-medium underline pt-1"
                                          style={{ color: venue.colors.accent }}
                                        >
                                          View all activity for {m.full_name}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 border-t" style={{ backgroundColor: venue.colors.background }}>
                      <p className="text-xs" style={{ color: venue.colors.textMuted }}>Page {memberPage} of {memberTotalPages}</p>
                      <div className="flex gap-2">
                        <button onClick={() => { setMemberPage(p => Math.max(1, p - 1)); setExpandedMemberId(null) }} disabled={memberPage === 1} className="px-3 py-1 text-xs rounded-lg border disabled:opacity-30 transition-all" style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}>Prev</button>
                        <button onClick={() => { setMemberPage(p => Math.min(memberTotalPages, p + 1)); setExpandedMemberId(null) }} disabled={memberPage === memberTotalPages} className="px-3 py-1 text-xs rounded-lg border disabled:opacity-30 transition-all" style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}>Next</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Redemptions Tab */}
            {activeTab === 'redemptions' && (() => {
              const REDEMPTION_PER_PAGE = 15
              const redemptionTotalPages = Math.max(1, Math.ceil(redemptionRows.length / REDEMPTION_PER_PAGE))
              const redemptionSlice = redemptionRows.slice((redemptionPage - 1) * REDEMPTION_PER_PAGE, redemptionPage * REDEMPTION_PER_PAGE)

              // Redemptions by reward type chart data
              const rewardCounts: Record<string, number> = {}
              const rewardPoints: Record<string, number> = {}
              redemptionRows.forEach(r => {
                rewardCounts[r.reward_name] = (rewardCounts[r.reward_name] || 0) + 1
                rewardPoints[r.reward_name] = (rewardPoints[r.reward_name] || 0) + r.points_spent
              })
              const chartColors = ['#10b981', '#f59e0b', '#6366f1', '#ec4899']
              const rewardNames = Object.keys(rewardCounts)
              const maxRewardCount = Math.max(...Object.values(rewardCounts), 1)
              const totalPointsSpent = Object.values(rewardPoints).reduce((s, v) => s + v, 0)

              return (
                <div className="space-y-6">
                  {/* Redemption Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow">
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Total Redemptions</p>
                      <p className="text-3xl font-serif mt-1" style={{ color: '#10b981' }}>{redemptionRows.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow">
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Points Spent</p>
                      <p className="text-3xl font-serif mt-1" style={{ color: venue.colors.accent }}>{totalPointsSpent}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow">
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Unique Rewards</p>
                      <p className="text-3xl font-serif mt-1" style={{ color: venue.colors.text }}>{rewardNames.length}</p>
                    </div>
                  </div>

                  {/* Redemptions by Reward Chart */}
                  {rewardNames.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow">
                      <h3 className="text-sm font-medium uppercase tracking-wide mb-4" style={{ color: venue.colors.textMuted }}>
                        Redemptions by Reward
                      </h3>
                      <div className="space-y-3">
                        {rewardNames.map((name, i) => (
                          <div key={name} className="flex items-center gap-3">
                            <div className="w-28 sm:w-32 text-xs font-medium truncate" style={{ color: venue.colors.text }}>{name}</div>
                            <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ backgroundColor: venue.colors.background }}>
                              <div
                                className="h-full rounded-lg flex items-center justify-end px-2 transition-all"
                                style={{ width: `${Math.max((rewardCounts[name] / maxRewardCount) * 100, 8)}%`, backgroundColor: chartColors[i % chartColors.length] }}
                              >
                                <span className="text-[11px] font-bold text-white">{rewardCounts[name]}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Redemptions Table */}
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium" style={{ color: venue.colors.text }}>
                      Redemption History ({redemptionRows.length})
                    </h3>
                    <button
                      onClick={() => {
                        const csv = [
                          ['Member Name', 'Email', 'Reward', 'Points Spent', 'Redeemed At'].join(','),
                          ...redemptionRows.map(r => {
                            const m = members.find(mem => mem.id === r.member_id)
                            const date = new Date(r.redeemed_at)
                            return [
                              m?.full_name || 'Unknown',
                              m?.email || '',
                              r.reward_name,
                              r.points_spent,
                              date.toLocaleString()
                            ].join(',')
                          })
                        ].join('\n')
                        const blob = new Blob([csv], { type: 'text/csv' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `redemptions-${new Date().toISOString().split('T')[0]}.csv`
                        a.click()
                      }}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-gray-100"
                      style={{ color: venue.colors.textMuted }}
                      title="Download CSV"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  </div>
                  {redemptionRows.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 shadow text-center" style={{ color: venue.colors.textLight }}>
                      <p>No redemptions yet</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr style={{ backgroundColor: venue.colors.background }}>
                              <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Member</th>
                              <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Reward</th>
                              <th className="text-center px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Points</th>
                              <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {redemptionSlice.map(r => {
                              const memberName = members.find(m => m.id === r.member_id)?.full_name || 'Unknown'
                              const date = new Date(r.redeemed_at)
                              return (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-2.5 text-sm font-medium" style={{ color: venue.colors.text }}>{memberName}</td>
                                  <td className="px-4 py-2.5 text-xs" style={{ color: venue.colors.textLight }}>{r.reward_name}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                                      -{r.points_spent}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-xs" style={{ color: venue.colors.textLight }}>
                                    {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} {date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 border-t" style={{ backgroundColor: venue.colors.background }}>
                        <p className="text-xs" style={{ color: venue.colors.textMuted }}>Page {redemptionPage} of {redemptionTotalPages}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setRedemptionPage(p => Math.max(1, p - 1))} disabled={redemptionPage === 1} className="px-3 py-1 text-xs rounded-lg border disabled:opacity-30 transition-all" style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}>Prev</button>
                          <button onClick={() => setRedemptionPage(p => Math.min(redemptionTotalPages, p + 1))} disabled={redemptionPage === redemptionTotalPages} className="px-3 py-1 text-xs rounded-lg border disabled:opacity-30 transition-all" style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}>Next</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Campaign Settings Tab */}
            {activeTab === 'campaign' && campaignData && (
              <div className="space-y-6">

                {/* Getting Started Guide */}
                <div className="rounded-2xl p-5 border" style={{ borderColor: venue.colors.accent, backgroundColor: `${venue.colors.accent}08` }}>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: venue.colors.accent }}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: venue.colors.text }}>Configure your loyalty program</p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: venue.colors.textLight }}>
                        Set your campaign name, how many points each check-in is worth, and create up to 4 reward tiers for your customers. Changes are saved instantly and reflected on the customer-facing pages.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signup URLs */}
                <div className="bg-white rounded-2xl p-6 shadow space-y-4">
                  <div>
                    <h3 className="font-medium text-lg" style={{ color: venue.colors.text }}>QR Display URLs</h3>
                    <p className="text-xs mt-0.5" style={{ color: venue.colors.textMuted }}>
                      Open these URLs on your tablet or POS system at checkout. Customers scan the QR code when purchasing to earn points. Each location has its own unique URL.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {venues.map((v) => {
                      // Use venue parameter for multi-tenant support (works without subdomain configuration)
                      const baseUrl = typeof window !== 'undefined' 
                        ? `${window.location.protocol}//${window.location.host}` 
                        : 'https://menulove.com.au'
                      const signupUrl = `${baseUrl}/qr-display?venue=${v.id}`
                      
                      return (
                        <div key={v.id} className="p-4 rounded-xl border" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {v.logo_url && (
                                <img src={v.logo_url} alt={v.venue_name} className="w-6 h-6 object-contain flex-shrink-0" />
                              )}
                              <p className="text-sm font-medium truncate" style={{ color: venue.colors.text }}>
                                {v.venue_name}
                              </p>
                            </div>
                            {v.id === currentVenue?.id && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: venue.colors.accent, color: 'white' }}>
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={signupUrl}
                              className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono bg-white"
                              style={{ borderColor: '#d4d4d4', color: venue.colors.text }}
                              onClick={(e) => e.currentTarget.select()}
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(signupUrl)
                                alert('URL copied to clipboard!')
                              }}
                              className="px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 whitespace-nowrap"
                              style={{ backgroundColor: venue.colors.primary, color: 'white' }}
                            >
                              Copy
                            </button>
                          </div>
                          <p className="text-[10px] mt-2" style={{ color: venue.colors.textMuted }}>
                            Open this URL on your tablet/POS at checkout. Customers scan the QR code to earn points at {v.venue_name}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Branding */}
                <div className="bg-white rounded-2xl p-6 shadow space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg" style={{ color: venue.colors.text }}>Branding</h3>
                      <p className="text-xs mt-0.5" style={{ color: venue.colors.textMuted }}>Your logo appears on the landing page, check-in, and rewards screens.</p>
                    </div>
                    <button
                      onClick={() => window.open(`/qr-display?venue=${currentVenue?.id}`, '_blank')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: venue.colors.accent, color: 'white' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      Preview QR Display
                    </button>
                  </div>

                  {/* Logo Preview */}
                  {campaignData.logo_url && (
                    <div className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: venue.colors.background }}>
                      <img src={campaignData.logo_url} alt="Logo preview" className="w-16 h-16 object-contain rounded-xl" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: venue.colors.text }}>
                          {campaignData.logo_url.startsWith('data:') ? 'logo.png' : (() => { try { return new URL(campaignData.logo_url).pathname.split('/').pop() || 'logo.png' } catch { return 'logo.png' } })()}
                        </p>
                        <p className="text-[11px]" style={{ color: venue.colors.textMuted }}>
                          {campaignData.logo_url.startsWith('data:') ? 'Uploaded file' : 'External URL'}
                        </p>
                      </div>
                      <button onClick={() => setCampaignData({ ...campaignData, logo_url: '' })} className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:bg-red-50" style={{ color: '#ef4444', borderColor: '#fecaca' }}>Remove</button>
                    </div>
                  )}

                  {/* Upload */}
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Upload Logo</label>
                    <div className="mt-1">
                      <label
                        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-solid"
                        style={{ borderColor: venue.colors.textMuted, color: venue.colors.textMuted }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium">
                          {isUploadingLogo ? 'Uploading...' : 'Choose logo file'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingLogo}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setIsUploadingLogo(true)
                            try {
                              const ext = file.name.split('.').pop()
                              const fileName = `${currentVenue?.id || 'venue'}-logo-${Date.now()}.${ext}`

                              // Upload to Supabase storage
                              const { data: uploadData, error: uploadError } = await supabase.storage
                                .from('logos')
                                .upload(fileName, file, { upsert: true })

                              if (uploadError) {
                                console.warn('Storage upload failed, using base64 fallback:', uploadError.message)
                                // Fallback: convert to base64 data URL
                                const reader = new FileReader()
                                reader.onload = async (ev) => {
                                  const dataUrl = ev.target?.result as string
                                  setCampaignData(prev => prev ? { ...prev, logo_url: dataUrl } : prev)
                                  
                                  // Save to venues table immediately
                                  if (currentVenue) {
                                    await supabase
                                      .from('venues')
                                      .update({ logo_url: dataUrl })
                                      .eq('id', currentVenue.id)
                                  }
                                  
                                  // Also save to campaign
                                  await supabase
                                    .from('loyalty_campaigns')
                                    .update({ logo_url: dataUrl })
                                    .eq('id', campaignData.id)
                                  
                                  setIsUploadingLogo(false)
                                  setSaveMessage('Logo uploaded successfully!')
                                  setTimeout(() => setSaveMessage(''), 3000)
                                }
                                reader.onerror = () => {
                                  setIsUploadingLogo(false)
                                  alert('Failed to read file')
                                }
                                reader.readAsDataURL(file)
                                return // Don't hit finally yet - FileReader is async
                              } else {
                                const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName)
                                const publicUrl = urlData.publicUrl
                                setCampaignData({ ...campaignData, logo_url: publicUrl })
                                
                                // Save to venues table immediately
                                if (currentVenue) {
                                  await supabase
                                    .from('venues')
                                    .update({ logo_url: publicUrl })
                                    .eq('id', currentVenue.id)
                                  
                                  // Update local state
                                  setCurrentVenue({ ...currentVenue, logo_url: publicUrl })
                                }
                                
                                // Also save to campaign
                                await supabase
                                  .from('loyalty_campaigns')
                                  .update({ logo_url: publicUrl })
                                  .eq('id', campaignData.id)
                                
                                setSaveMessage('Logo uploaded successfully!')
                                setTimeout(() => setSaveMessage(''), 3000)
                              }
                            } catch (err) {
                              console.error('Upload error:', err)
                              alert('Failed to upload logo: ' + (err as any)?.message)
                            } finally {
                              setIsUploadingLogo(false)
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: venue.colors.textMuted }}>PNG, JPG or SVG. Square format recommended.</p>
                  </div>

                  {/* Save Logo Button */}
                  <button
                    onClick={async () => {
                      setIsSaving(true)
                      setSaveMessage('')
                      try {
                        const { error } = await supabase
                          .from('loyalty_campaigns')
                          .update({ logo_url: campaignData.logo_url || null })
                          .eq('id', campaignData.id)
                        if (error) {
                          console.error('Logo save error:', error)
                          setSaveMessage('Error saving logo')
                        } else {
                          setSaveMessage('Logo saved successfully!')
                        }
                      } catch (err) {
                        console.error('Logo save exception:', err)
                        setSaveMessage('Error saving logo')
                      } finally {
                        setIsSaving(false)
                        setTimeout(() => setSaveMessage(''), 3000)
                      }
                    }}
                    disabled={isSaving}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50"
                    style={{ backgroundColor: venue.colors.primary }}
                  >
                    {isSaving ? 'Saving...' : 'Save Logo'}
                  </button>
                  
                  {saveMessage && (
                    <p className="text-center text-sm font-medium mt-2" style={{ color: saveMessage.includes('Error') ? '#ef4444' : '#10b981' }}>
                      {saveMessage}
                    </p>
                  )}
                </div>

                {/* Campaign Settings */}
                <div className="bg-white rounded-2xl p-6 shadow space-y-4">
                  <div>
                    <h3 className="font-medium text-lg" style={{ color: venue.colors.text }}>Campaign Settings</h3>
                    <p className="text-xs mt-0.5" style={{ color: venue.colors.textMuted }}>Define the name and earning rate for your loyalty program.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Business Name</label>
                      <input
                        type="text"
                        value={campaignData.campaign_name.replace(' POINTS CLUB', '')}
                        onChange={(e) => {
                          const businessName = e.target.value
                          setCampaignData({ ...campaignData, campaign_name: businessName ? `${businessName} POINTS CLUB` : '' })
                        }}
                        onBlur={async (e) => {
                          const businessName = e.target.value.trim()
                          const fullCampaignName = businessName ? `${businessName} POINTS CLUB` : ''
                          setCampaignData({ ...campaignData, campaign_name: fullCampaignName })
                          
                          // Save to database and sync with venue_name and subdomain
                          if (businessName && currentVenue) {
                            try {
                              // Generate subdomain from business name
                              const subdomain = businessName.toLowerCase().replace(/\s+/g, '')
                              
                              // Update campaign
                              await supabase
                                .from('loyalty_campaigns')
                                .update({ campaign_name: fullCampaignName })
                                .eq('id', campaignData.id)
                              
                              // Sync venue_name and subdomain
                              await supabase
                                .from('venues')
                                .update({ 
                                  venue_name: businessName,
                                  subdomain: subdomain
                                })
                                .eq('id', currentVenue.id)
                              
                              // Update local state to reflect new subdomain
                              setCurrentVenue({ ...currentVenue, venue_name: businessName, subdomain: subdomain })
                            } catch (err) {
                              console.error('Save error:', err)
                            }
                          }
                        }}
                        placeholder="Enter your business name"
                        className="w-full mt-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                        style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                      />
                      <p className="text-[11px] mt-1" style={{ color: venue.colors.textMuted }}>
                        Will appear as "Your [Business Name] Rewards" on the landing page. "POINTS CLUB" is added automatically.
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Points Per Check-in</label>
                      <input
                        type="number"
                        value={campaignData.points_per_checkin}
                        onChange={(e) => setCampaignData({ ...campaignData, points_per_checkin: parseInt(e.target.value) || 5 })}
                        className="w-full mt-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                        style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                        min={1}
                        max={100}
                      />
                      <p className="text-[11px] mt-1" style={{ color: venue.colors.textMuted }}>How many points a customer earns per visit.</p>
                    </div>
                  </div>
                </div>

                {/* Reward Tiers */}
                <div className="bg-white rounded-2xl p-6 shadow space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg" style={{ color: venue.colors.text }}>Reward Tiers</h3>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: venue.colors.textMuted }}>
                        Create up to 4 rewards. Customers earn {campaignData.points_per_checkin} points per check-in (once per day) and unlock rewards as they accumulate points. 
                        <span className="block mt-1 italic">
                          Example: Set rewards at 50, 100, 150, and 200 points. A customer checking in daily will unlock their first reward after {Math.ceil(50 / campaignData.points_per_checkin)} visits.
                        </span>
                      </p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: venue.colors.background, color: venue.colors.textMuted }}>
                      {rewardsData.length}/4 slots
                    </span>
                  </div>

                  <div className="space-y-4">
                    {rewardsData.map((reward, index) => (
                      <div key={reward.id} className="rounded-xl border p-5 space-y-3" style={{ borderColor: reward.active ? venue.colors.accent : '#e5e7eb', opacity: reward.active ? 1 : 0.6 }}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ backgroundColor: venue.colors.accent }}>
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-sm" style={{ color: venue.colors.text }}>
                              {reward.name || `Reward ${index + 1}`}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <span className="text-[11px]" style={{ color: venue.colors.textMuted }}>{reward.active ? 'Active' : 'Inactive'}</span>
                              <button
                                onClick={() => {
                                  const updated = [...rewardsData]
                                  updated[index] = { ...reward, active: !reward.active }
                                  setRewardsData(updated)
                                }}
                                className="w-10 h-6 rounded-full transition-colors relative"
                                style={{ backgroundColor: reward.active ? '#10b981' : '#d1d5db' }}
                              >
                                <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all" style={{ left: reward.active ? '22px' : '4px' }} />
                              </button>
                            </label>
                            {rewardsData.length > 1 && (
                              <button
                                onClick={() => setRewardsData(rewardsData.filter((_, i) => i !== index))}
                                className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-red-50"
                                style={{ color: '#ef4444' }}
                                title="Remove reward"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Reward Name</label>
                            <input
                              type="text"
                              value={reward.name}
                              onChange={(e) => {
                                const updated = [...rewardsData]
                                updated[index] = { ...reward, name: e.target.value }
                                setRewardsData(updated)
                              }}
                              placeholder="e.g. Free Coffee"
                              className="w-full mt-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm"
                              style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Points Required</label>
                            <input
                              type="number"
                              value={reward.points_required}
                              onChange={(e) => {
                                const updated = [...rewardsData]
                                updated[index] = { ...reward, points_required: parseInt(e.target.value) || 0 }
                                setRewardsData(updated)
                              }}
                              placeholder="50"
                              className="w-full mt-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm"
                              style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                              min={1}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Description</label>
                          <input
                            type="text"
                            value={reward.description}
                            onChange={(e) => {
                              const updated = [...rewardsData]
                              updated[index] = { ...reward, description: e.target.value }
                              setRewardsData(updated)
                            }}
                            placeholder="A short description shown to customers"
                            className="w-full mt-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm"
                            style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Reward Button */}
                  {rewardsData.length < 4 && (
                    <button
                      onClick={() => {
                        const newReward: RewardData = {
                          id: `new-${Date.now()}`,
                          campaign_id: campaignData.id,
                          name: '',
                          points_required: 0,
                          description: '',
                          active: true,
                          sort_order: rewardsData.length + 1,
                        }
                        setRewardsData([...rewardsData, newReward])
                      }}
                      className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-all hover:border-solid"
                      style={{ borderColor: venue.colors.textMuted, color: venue.colors.textMuted }}
                    >
                      + Add Reward Tier ({rewardsData.length}/4)
                    </button>
                  )}

                  {rewardsData.length >= 4 && (
                    <p className="text-xs text-center" style={{ color: venue.colors.textMuted }}>
                      Maximum of 4 reward tiers reached.
                    </p>
                  )}
                </div>

                {/* Save Button */}
                <button
                  onClick={async () => {
                    if (!campaignData) return
                    setIsSaving(true)
                    setSaveMessage('')

                    try {
                      // 1. Update campaign
                      console.log('Saving campaign:', campaignData.id)
                      const campRes = await supabase
                        .from('loyalty_campaigns')
                        .update({
                          campaign_name: campaignData.campaign_name,
                          points_per_checkin: campaignData.points_per_checkin,
                        })
                        .eq('id', campaignData.id)
                        .select()
                      
                      console.log('Campaign result:', campRes)
                      if (campRes.error) throw new Error(`Campaign: ${campRes.error.message}`)

                      // 2. Save rewards
                      for (let i = 0; i < rewardsData.length; i++) {
                        const reward = rewardsData[i]
                        if (reward.id.startsWith('new-')) {
                          console.log('Inserting reward:', reward.name)
                          const res = await supabase.from('loyalty_rewards').insert({
                            campaign_id: campaignData.id,
                            name: reward.name,
                            points_required: reward.points_required,
                            description: reward.description || '',
                            active: reward.active,
                            sort_order: i + 1,
                          }).select()
                          console.log('Insert result:', res)
                          if (res.error) throw new Error(`Insert ${reward.name}: ${res.error.message}`)
                        } else {
                          console.log('Updating reward:', reward.id, reward.name)
                          const res = await supabase.from('loyalty_rewards').update({
                            name: reward.name,
                            points_required: reward.points_required,
                            description: reward.description || '',
                            active: reward.active,
                            sort_order: i + 1,
                          }).eq('id', reward.id).select()
                          console.log('Update result:', res)
                          if (res.error) throw new Error(`Update ${reward.name}: ${res.error.message}`)
                        }
                      }

                      // 3. Reload rewards
                      const { data: freshRewards } = await supabase
                        .from('loyalty_rewards')
                        .select('*')
                        .eq('campaign_id', campaignData.id)
                        .order('sort_order', { ascending: true })
                      if (freshRewards) setRewardsData(freshRewards)

                      setSaveMessage('Settings saved successfully!')
                      setTimeout(() => setSaveMessage(''), 3000)
                    } catch (err: any) {
                      console.error('Save error:', err)
                      setSaveMessage(`Error: ${err.message || 'Failed to save'}`)
                      setTimeout(() => setSaveMessage(''), 5000)
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  disabled={isSaving}
                  className="w-full text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg"
                  style={{ backgroundColor: venue.colors.primary }}
                >
                  {isSaving ? 'Saving...' : 'Save All Changes'}
                </button>

                {saveMessage && (
                  <p className="text-center text-sm font-medium" style={{ color: saveMessage.includes('Error') ? '#ef4444' : '#10b981' }}>
                    {saveMessage}
                  </p>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (() => {
              const ACTIVITY_PER_PAGE = 15
              const filteredActivity = activitySearch
                ? checkIns.filter(ci => {
                    const m = members.find(mem => mem.id === ci.member_id)
                    return m?.full_name?.toLowerCase().includes(activitySearch.toLowerCase())
                  })
                : checkIns
              const activityTotalPages = Math.max(1, Math.ceil(filteredActivity.length / ACTIVITY_PER_PAGE))
              const activitySlice = filteredActivity.slice((activityPage - 1) * ACTIVITY_PER_PAGE, activityPage * ACTIVITY_PER_PAGE)

              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="font-medium" style={{ color: venue.colors.text }}>
                      Recent Activity ({filteredActivity.length} check-ins)
                    </h3>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        value={activitySearch}
                        onChange={(e) => { setActivitySearch(e.target.value); setActivityPage(1) }}
                        placeholder="Search by name..."
                        className="px-3 py-2 rounded-lg border text-sm w-full sm:w-56 focus:outline-none focus:ring-2"
                        style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                      />
                      <button
                        onClick={() => {
                          const csv = [
                            ['Member Name', 'Email', 'Venue', 'Check-in Date', 'Check-in Time'].join(','),
                            ...filteredActivity.map(ci => {
                              const m = members.find(mem => mem.id === ci.member_id)
                              const date = new Date(ci.checked_in_at)
                              return [
                                m?.full_name || 'Unknown',
                                m?.email || '',
                                ci.venue,
                                date.toLocaleDateString(),
                                date.toLocaleTimeString()
                              ].join(',')
                            })
                          ].join('\n')
                          const blob = new Blob([csv], { type: 'text/csv' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `activity-${new Date().toISOString().split('T')[0]}.csv`
                          a.click()
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-gray-100"
                        style={{ color: venue.colors.textMuted }}
                        title="Download CSV"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {activitySearch && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: venue.colors.accent, color: '#fff' }}>
                        {activitySearch}
                      </span>
                      <button onClick={() => { setActivitySearch(''); setActivityPage(1) }} className="text-xs underline" style={{ color: venue.colors.textMuted }}>
                        Clear filter
                      </button>
                    </div>
                  )}
                  <div className="bg-white rounded-2xl shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: venue.colors.background }}>
                            <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Member</th>
                            <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Date</th>
                            <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Time</th>
                            <th className="text-right px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {activitySlice.map(ci => {
                            const m = members.find(mem => mem.id === ci.member_id)
                            const date = new Date(ci.checked_in_at)
                            return (
                              <tr key={ci.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2.5">
                                  <button
                                    onClick={() => { setActivitySearch(m?.full_name || ''); setActivityPage(1) }}
                                    className="text-sm font-medium hover:underline cursor-pointer transition-all"
                                    style={{ color: venue.colors.accent }}
                                  >
                                    {m?.full_name || 'Unknown'}
                                  </button>
                                </td>
                                <td className="px-4 py-2.5 text-xs" style={{ color: venue.colors.textLight }}>
                                  {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-2.5 text-xs" style={{ color: venue.colors.textLight }}>
                                  {date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    onClick={() => {
                                      if (m) {
                                        setActiveTab('members')
                                        setMemberSearch(m.full_name)
                                        setExpandedMemberId(m.id)
                                        setMemberPage(1)
                                      }
                                    }}
                                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all hover:bg-gray-50"
                                    style={{ borderColor: venue.colors.textMuted, color: venue.colors.textLight }}
                                  >
                                    See details
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t" style={{ backgroundColor: venue.colors.background }}>
                      <p className="text-xs" style={{ color: venue.colors.textMuted }}>
                        Page {activityPage} of {activityTotalPages}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                          disabled={activityPage === 1}
                          className="px-3 py-1 text-xs rounded-lg border disabled:opacity-30 transition-all"
                          style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                        >
                          Prev
                        </button>
                        <button
                          onClick={() => setActivityPage(p => Math.min(activityTotalPages, p + 1))}
                          disabled={activityPage === activityTotalPages}
                          className="px-3 py-1 text-xs rounded-lg border disabled:opacity-30 transition-all"
                          style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Account & Billing Tab */}
            {activeTab === 'account' && owner && (
              <div className="space-y-6">
                {/* Account Overview */}
                <div className="bg-white rounded-2xl p-6 shadow space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-lg mb-1" style={{ color: venue.colors.text }}>Account Information</h3>
                      <p className="text-xs" style={{ color: venue.colors.textMuted }}>Manage your account details and subscription</p>
                    </div>
                    {!isEditingAccount ? (
                      <button
                        onClick={() => {
                          setIsEditingAccount(true)
                          setEditedOwner({
                            full_name: owner.full_name,
                            email: owner.email,
                            phone: owner.phone || ''
                          })
                        }}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all hover:bg-gray-50"
                        style={{ borderColor: venue.colors.textMuted, color: venue.colors.accent }}
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditingAccount(false)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all hover:bg-gray-50"
                          style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('venue_owners')
                                .update({
                                  full_name: editedOwner.full_name,
                                  email: editedOwner.email,
                                  phone: editedOwner.phone || null
                                })
                                .eq('id', owner.id)
                              
                              if (error) throw error
                              
                              setIsEditingAccount(false)
                              window.location.reload()
                            } catch (err) {
                              console.error('Update error:', err)
                              alert('Failed to update account')
                            }
                          }}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                          style={{ backgroundColor: venue.colors.primary, color: 'white' }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Owner Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Full Name</label>
                      {isEditingAccount ? (
                        <input
                          type="text"
                          value={editedOwner.full_name}
                          onChange={(e) => setEditedOwner({ ...editedOwner, full_name: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                          style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium" style={{ color: venue.colors.text }}>{owner.full_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Email</label>
                      {isEditingAccount ? (
                        <input
                          type="email"
                          value={editedOwner.email}
                          onChange={(e) => setEditedOwner({ ...editedOwner, email: e.target.value })}
                          className="w-full mt-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                          style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium" style={{ color: venue.colors.text }}>{owner.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Phone</label>
                      {isEditingAccount ? (
                        <input
                          type="tel"
                          value={editedOwner.phone}
                          onChange={(e) => setEditedOwner({ ...editedOwner, phone: e.target.value })}
                          placeholder="+61491706580"
                          className="w-full mt-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                          style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                        />
                      ) : (
                        <p className="mt-1 text-sm font-medium" style={{ color: venue.colors.text }}>{owner.phone || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Active Locations</label>
                      <p className="mt-1 text-sm font-medium" style={{ color: venue.colors.text }}>{venues.length} {venues.length === 1 ? 'location' : 'locations'}</p>
                    </div>
                  </div>

                  {/* Locations List */}
                  {venues.length > 0 && (
                    <div className="pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
                      <label className="text-xs font-medium uppercase tracking-wide mb-3 block" style={{ color: venue.colors.textMuted }}>Your Locations</label>
                      <div className="space-y-2">
                        {venues.map((v) => (
                          <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: '#e5e7eb' }}>
                            <div className="flex items-center gap-3">
                              {v.logo_url && (
                                <img src={v.logo_url} alt={v.venue_name} className="w-8 h-8 object-contain" />
                              )}
                              <div>
                                <p className="text-sm font-medium" style={{ color: venue.colors.text }}>{v.venue_name}</p>
                                <p className="text-xs" style={{ color: venue.colors.textMuted }}>{v.subdomain}.menulove.com.au</p>
                              </div>
                            </div>
                            {venues.length > 1 && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`Delete "${v.venue_name}"? This will permanently remove all data for this location including all members, check-ins, and campaigns.`)) return
                                  
                                  try {
                                    // If deleting current venue, switch to another one first
                                    if (currentVenue?.id === v.id) {
                                      const otherVenue = venues.find(venue => venue.id !== v.id)
                                      if (otherVenue) {
                                        setCurrentVenue(otherVenue)
                                      }
                                    }

                                    // Delete the venue
                                    const { error } = await supabase
                                      .from('venues')
                                      .delete()
                                      .eq('id', v.id)
                                      .eq('owner_id', owner.id)
                                    
                                    if (error) {
                                      console.error('Delete error:', error)
                                      throw error
                                    }
                                    
                                    // Reload to refresh venue list
                                    window.location.reload()
                                  } catch (err: any) {
                                    console.error('Delete error:', err)
                                    alert(`Failed to delete location: ${err.message || 'Unknown error'}`)
                                  }
                                }}
                                className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:bg-red-50"
                                style={{ borderColor: '#fee', color: '#dc2626' }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add New Location Button */}
                  <div className="pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
                    <button
                      onClick={() => {
                        setShowAddLocation(true)
                        setNewLocation({ venue_name: '', subdomain: '' })
                      }}
                      className="w-full py-3 rounded-xl font-medium border-2 border-dashed transition-all hover:bg-gray-50"
                      style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                    >
                      + Add New Location
                    </button>
                    <p className="text-[11px] text-center mt-2" style={{ color: venue.colors.textMuted }}>
                      Each additional location is $29.90/month
                    </p>
                  </div>
                </div>

                {/* Subscription Info */}
                <div className="bg-white rounded-2xl p-6 shadow space-y-6">
                  <div>
                    <h3 className="font-medium text-lg mb-1" style={{ color: venue.colors.text }}>Subscription & Billing</h3>
                    <p className="text-xs" style={{ color: venue.colors.textMuted }}>Your current plan and payment details</p>
                  </div>

                  {/* Current Plan */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: venue.colors.background }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium" style={{ color: venue.colors.text }}>Current Plan</p>
                        <p className="text-xs mt-0.5" style={{ color: venue.colors.textMuted }}>Professional</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: venue.colors.primary }}>$29.90</p>
                        <p className="text-xs" style={{ color: venue.colors.textMuted }}>per location/month</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#10b981', color: 'white' }}>
                        14 DAYS FREE TRIAL
                      </span>
                      <p className="text-xs" style={{ color: venue.colors.textMuted }}>Active until trial ends</p>
                    </div>
                  </div>

                  {/* Billing Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Total Locations</span>
                      <span className="text-sm font-medium" style={{ color: venue.colors.text }}>{venues.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Monthly Total</span>
                      <span className="text-sm font-medium" style={{ color: venue.colors.text }}>${(29.90 * venues.length).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Next Billing Date</span>
                      <span className="text-sm font-medium" style={{ color: venue.colors.text }}>
                        {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Features Included */}
                  <div className="pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
                    <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: venue.colors.textMuted }}>Included Features</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        'Unlimited members',
                        'Analytics & insights',
                        'Email notifications',
                        'Custom branding',
                        'QR code display',
                        'Multi-location support'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" style={{ color: '#10b981' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs" style={{ color: venue.colors.text }}>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
                    <button
                      onClick={() => setShowPaymentMethod(true)}
                      className="flex-1 py-3 rounded-xl font-medium transition-all hover:opacity-90"
                      style={{ backgroundColor: venue.colors.primary, color: 'white' }}
                    >
                      Manage Payment Method
                    </button>
                    <button
                      onClick={() => setShowInvoices(true)}
                      className="flex-1 py-3 rounded-xl font-medium border transition-all hover:bg-gray-50"
                      style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                    >
                      View Billing History
                    </button>
                  </div>
                </div>

                {/* Support */}
                <div className="bg-white rounded-2xl p-6 shadow">
                  <h3 className="font-medium text-lg mb-3" style={{ color: venue.colors.text }}>Need Help?</h3>
                  <p className="text-sm mb-4" style={{ color: venue.colors.textLight }}>
                    Our support team is here to help you get the most out of your loyalty program.
                  </p>
                  <a
                    href="mailto:contact@menulove.com.au"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                    style={{ backgroundColor: venue.colors.accent, color: 'white' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Support
                  </a>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center py-6 space-y-1">
          <p className="text-xs tracking-wide" style={{ color: venue.colors.textMuted }}>
            Powered by MenuLove™
          </p>
          <p className="text-[11px]" style={{ color: venue.colors.textMuted }}>
            Need help? <a href="mailto:contact@menulove.com.au" className="underline hover:opacity-80 transition-opacity" style={{ color: venue.colors.accent }}>contact@menulove.com.au</a>
          </p>
        </div>
      </div>

      {/* Insight Action Modal */}
      {insightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{insightModal.alert.icon}</span>
                  <div>
                    <p className="text-lg font-serif font-bold" style={{ color: insightModal.alert.color }}>
                      {insightModal.alert.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{insightModal.alert.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={() => setInsightModal(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all"
                  style={{ color: '#6b7280' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {insightModal.sent ? (
              /* Success State */
              <div className="p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: insightModal.alert.bgColor }}>
                  <svg className="w-8 h-8" fill="none" stroke={insightModal.alert.color} viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-serif font-bold" style={{ color: venue.colors.text }}>Emails Sent!</p>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  Campaign sent to {insightModal.alert.members.length} customer{insightModal.alert.members.length !== 1 ? 's' : ''}. 
                  Check your inbox for delivery status.
                </p>
                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  Action logged for analytics.
                </p>
                <button
                  onClick={() => setInsightModal(null)}
                  className="mt-2 px-6 py-2 rounded-xl text-sm font-medium text-white transition-all"
                  style={{ backgroundColor: venue.colors.primary }}
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form State */
              <div className="p-6 space-y-5">
                {/* Recipients Summary */}
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: insightModal.alert.bgColor }}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-serif font-bold" style={{ color: insightModal.alert.color }}>
                      {insightModal.alert.members.length}
                    </span>
                    <span className="text-xs font-medium" style={{ color: '#6b7280' }}>
                      customer{insightModal.alert.members.length !== 1 ? 's' : ''} will receive this message
                    </span>
                  </div>
                  <button
                    onClick={() => setInsightModal({ ...insightModal, showList: !insightModal.showList })}
                    className="text-[11px] font-medium underline"
                    style={{ color: insightModal.alert.color }}
                  >
                    {insightModal.showList ? 'Hide list' : 'View list'}
                  </button>
                </div>

                {/* Customer List */}
                {insightModal.showList && (
                  <div className="max-h-40 overflow-y-auto rounded-xl border" style={{ borderColor: '#e5e7eb' }}>
                    {insightModal.alert.members.map((m, i) => (
                      <div key={m.id} className={`flex items-center justify-between px-3 py-2 text-xs ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: '#f3f4f6' }}>
                        <div>
                          <span className="font-medium" style={{ color: venue.colors.text }}>{m.full_name}</span>
                          <span className="ml-2" style={{ color: '#9ca3af' }}>{m.email}</span>
                        </div>
                        <span className="font-bold px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: insightModal.alert.bgColor, color: insightModal.alert.color }}>
                          {m.points || 0} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Channel */}
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#6b7280' }}>Channel</label>
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-xs px-3 py-1.5 rounded-lg font-medium text-white" style={{ backgroundColor: insightModal.alert.color }}>
                      Email
                    </span>
                    <span className="text-xs px-3 py-1.5 rounded-lg font-medium border cursor-not-allowed opacity-40" style={{ borderColor: '#d1d5db', color: '#9ca3af' }}>
                      SMS (coming soon)
                    </span>
                    <span className="text-xs px-3 py-1.5 rounded-lg font-medium border cursor-not-allowed opacity-40" style={{ borderColor: '#d1d5db', color: '#9ca3af' }}>
                      Push (coming soon)
                    </span>
                  </div>
                </div>

                {/* Email From */}
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#6b7280' }}>From</label>
                  <input
                    type="email"
                    value={`noreply@${venue.brand.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`}
                    readOnly
                    className="w-full mt-1.5 px-4 py-2.5 rounded-xl border bg-gray-50 text-sm"
                    style={{ borderColor: '#d1d5db', color: '#6b7280' }}
                  />
                  <p className="text-[10px] mt-1" style={{ color: '#9ca3af' }}>
                    Configure este domínio na sua conta Resend para enviar emails
                  </p>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#6b7280' }}>Subject</label>
                  <input
                    type="text"
                    value={`A special message from ${venue.brand}`}
                    readOnly
                    className="w-full mt-1.5 px-4 py-2.5 rounded-xl border bg-gray-50 text-sm"
                    style={{ borderColor: '#d1d5db', color: '#6b7280' }}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#6b7280' }}>Message Template</label>
                  <textarea
                    value={insightModal.message}
                    onChange={(e) => setInsightModal({ ...insightModal, message: e.target.value })}
                    rows={4}
                    className="w-full mt-1.5 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm resize-none"
                    style={{ borderColor: '#d1d5db', color: venue.colors.text }}
                  />
                  <p className="text-[10px] mt-1" style={{ color: '#9ca3af' }}>
                    Use {'{name}'} to personalize. Each customer gets their own version.
                  </p>
                </div>

                {/* Email Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#6b7280' }}>Email Preview</label>
                    <button
                      onClick={() => setInsightModal({ ...insightModal, showPreview: !insightModal.showPreview })}
                      className="text-[11px] font-medium underline"
                      style={{ color: insightModal.alert.color }}
                    >
                      {insightModal.showPreview ? 'Hide' : 'Show'} preview
                    </button>
                  </div>
                  
                  {insightModal.showPreview && (
                    <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                      {/* Email Header */}
                      <div className="bg-gray-50 px-4 py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: venue.colors.primary }}>
                              {venue.brand.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-medium" style={{ color: venue.colors.text }}>{venue.brand}</p>
                              <p className="text-[10px]" style={{ color: '#6b7280' }}>
                                to: John Doe (example)
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px]" style={{ color: '#9ca3af' }}>Just now</span>
                        </div>
                      </div>
                      
                      {/* Email Subject */}
                      <div className="px-4 py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                        <p className="text-sm font-medium" style={{ color: venue.colors.text }}>
                          A special message from {venue.brand}
                        </p>
                      </div>
                      
                      {/* Email Body */}
                      <div className="px-4 py-4 bg-white">
                        <div className="space-y-2">
                          <p className="text-sm" style={{ color: venue.colors.text, lineHeight: '1.5' }}>
                            {insightModal.message.replace(/{name}/g, 'John Doe').split('\n').map((line, i) => (
                              <span key={i}>
                                {line}
                                {i < insightModal.message.split('\n').length - 1 && <br />}
                              </span>
                            ))}
                          </p>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t" style={{ borderColor: '#f3f4f6' }}>
                          <p className="text-xs" style={{ color: '#9ca3af' }}>
                            This message was sent from {venue.brand} loyalty program.
                          </p>
                          <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                            {venue.brand} • Your local cafe
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setInsightModal(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
                    style={{ borderColor: '#d1d5db', color: '#6b7280' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setInsightModal({ ...insightModal, sending: true })
                      try {
                        // Prepare recipients
                        const recipients = insightModal.alert.members.map(m => ({
                          email: m.email,
                          name: m.full_name
                        }))
                        
                        const fromEmail = `noreply@${venue.brand.toLowerCase().replace(/\s+/g, '')}.com`
                        const subject = `A special message from ${venue.brand}`
                        
                        // Send emails via Resend
                        const response = await fetch('/api/send-email', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            recipients,
                            subject,
                            message: insightModal.message,
                            fromEmail
                          })
                        })
                        
                        const result = await response.json()
                        
                        if (!response.ok) {
                          throw new Error(result.error || 'Failed to send emails')
                        }
                        
                        // Log the action to insight_actions table
                        await supabase.from('insight_actions').insert({
                          venue_id: venue.id,
                          action_type: insightModal.alert.type,
                          message: insightModal.message,
                          recipients_count: insightModal.alert.members.length,
                          recipient_ids: insightModal.alert.members.map(m => m.id),
                          channel: 'email',
                          status: 'sent',
                        })
                        
                        console.log(`Email campaign sent: ${result.success} sent, ${result.failed} failed`)
                        setInsightModal({ ...insightModal, sending: false, sent: true })
                      } catch (err) {
                        console.error('Insight action error:', err)
                        setInsightModal({ ...insightModal, sending: false })
                      }
                    }}
                    disabled={insightModal.sending || !insightModal.message.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                    style={{ backgroundColor: insightModal.alert.color }}
                  >
                    {insightModal.sending ? 'Sending...' : `Send to ${insightModal.alert.members.length} customer${insightModal.alert.members.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif font-bold" style={{ color: venue.colors.text }}>Payment Method</h3>
                <button
                  onClick={() => setShowPaymentMethod(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all"
                  style={{ color: '#6b7280' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl border-2 border-dashed" style={{ borderColor: venue.colors.textMuted }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#1a1f71' }}>
                    <span className="text-white text-xs font-bold">VISA</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: venue.colors.text }}>•••• •••• •••• 4242</p>
                    <p className="text-xs" style={{ color: venue.colors.textMuted }}>Expires 12/25</p>
                  </div>
                </div>
                <p className="text-xs" style={{ color: venue.colors.textMuted }}>
                  This is a demo card. In production, you'll connect to Stripe for real payment processing.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => alert('Stripe integration coming soon! You will be able to update your payment method securely.')}
                  className="w-full py-3 rounded-xl font-medium transition-all hover:opacity-90"
                  style={{ backgroundColor: venue.colors.primary, color: 'white' }}
                >
                  Update Payment Method
                </button>
                <button
                  onClick={() => setShowPaymentMethod(false)}
                  className="w-full py-3 rounded-xl font-medium border transition-all hover:bg-gray-50"
                  style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Modal */}
      {showInvoices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif font-bold" style={{ color: venue.colors.text }}>Billing History</h3>
                <button
                  onClick={() => setShowInvoices(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all"
                  style={{ color: '#6b7280' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Trial Notice */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #10b981' }}>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" style={{ color: '#10b981' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#065f46' }}>Free Trial Active</p>
                    <p className="text-xs mt-1" style={{ color: '#047857' }}>
                      You're currently in your 14-day free trial. Your first invoice will be generated on {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sample Invoices */}
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Upcoming Invoice</p>
                
                <div className="border rounded-xl p-4 hover:bg-gray-50 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium" style={{ color: venue.colors.text }}>
                        Invoice #{new Date().getFullYear()}-001
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: venue.colors.textMuted }}>
                        Due {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: venue.colors.text }}>
                        ${(29.90 * venues.length).toFixed(2)}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                        Pending
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t" style={{ borderColor: '#e5e7eb' }}>
                    <div className="flex items-center justify-between text-xs" style={{ color: venue.colors.textMuted }}>
                      <span>{venues.length} location{venues.length !== 1 ? 's' : ''} × $29.90</span>
                      <button
                        onClick={() => alert('Invoice download coming soon!')}
                        className="text-xs font-medium hover:underline"
                        style={{ color: venue.colors.accent }}
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-center pt-4" style={{ color: venue.colors.textMuted }}>
                  No previous invoices. Your billing history will appear here after your trial ends.
                </p>
              </div>

              <button
                onClick={() => setShowInvoices(false)}
                className="w-full py-3 rounded-xl font-medium border transition-all hover:bg-gray-50"
                style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif font-bold" style={{ color: venue.colors.text }}>Add New Location</h3>
                <button
                  onClick={() => setShowAddLocation(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all"
                  style={{ color: '#6b7280' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Venue Name</label>
                <input
                  type="text"
                  value={newLocation.venue_name}
                  onChange={(e) => setNewLocation({ ...newLocation, venue_name: e.target.value })}
                  placeholder="e.g., Mooloo Brew - CBD"
                  className="w-full mt-1.5 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                />
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Subdomain</label>
                <input
                  type="text"
                  value={newLocation.subdomain}
                  onChange={(e) => setNewLocation({ ...newLocation, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="e.g., mooloo-cbd"
                  className="w-full mt-1.5 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                />
                <p className="text-[10px] mt-1" style={{ color: venue.colors.textMuted }}>
                  This will be used for your location's URL: {newLocation.subdomain || 'subdomain'}.menulove.com.au
                </p>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
                <p className="text-xs font-medium" style={{ color: '#92400e' }}>
                  💰 Additional cost: $29.90/month
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={async () => {
                    if (!newLocation.venue_name || !newLocation.subdomain) {
                      alert('Please fill in all fields')
                      return
                    }
                    
                    if (!owner) {
                      alert('Owner not found')
                      return
                    }
                    
                    setIsAddingLocation(true)
                    try {
                      const { data, error } = await supabase
                        .from('venues')
                        .insert({
                          id: newLocation.subdomain, // Use subdomain as ID
                          owner_id: owner.id,
                          venue_name: newLocation.venue_name,
                          subdomain: newLocation.subdomain,
                          active: true
                        })
                        .select()
                        .single()
                      
                      if (error) throw error
                      
                      // Create default campaign for new venue
                      await supabase
                        .from('loyalty_campaigns')
                        .insert({
                          venue_id: data.id,
                          campaign_name: `${newLocation.venue_name} Points Club`,
                          points_per_checkin: 5,
                          active: true
                        })
                      
                      alert('Location added successfully!')
                      setShowAddLocation(false)
                      window.location.reload()
                    } catch (err: any) {
                      console.error('Add location error:', err)
                      alert(err.message || 'Failed to add location')
                    } finally {
                      setIsAddingLocation(false)
                    }
                  }}
                  disabled={isAddingLocation}
                  className="w-full py-3 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: venue.colors.primary, color: 'white' }}
                >
                  {isAddingLocation ? 'Adding...' : 'Add Location'}
                </button>
                <button
                  onClick={() => setShowAddLocation(false)}
                  disabled={isAddingLocation}
                  className="w-full py-3 rounded-xl font-medium border transition-all hover:bg-gray-50"
                  style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isDeleting && setMemberToDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border-2 border-amber-200 bg-amber-50">
            <div className="flex justify-center pt-6">
              <div className="p-3 rounded-full bg-amber-50 border border-amber-200">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="px-6 py-4 text-center">
              <h3 className="text-lg font-semibold mb-2 text-amber-900">Delete Member</h3>
              <p className="text-sm text-amber-700 leading-relaxed">
                Are you sure you want to delete &quot;{memberToDelete.full_name}&quot;? This will permanently remove all their data including check-ins and rewards.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setMemberToDelete(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true)
                  try {
                    console.log('Deleting member:', memberToDelete.id, memberToDelete.full_name)
                    
                    // Try RPC first (bypasses RLS)
                    const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_member_cascade', {
                      p_member_id: memberToDelete.id
                    })
                    
                    if (rpcError) {
                      console.warn('RPC delete failed, trying direct delete:', rpcError.message)
                      // Fallback: direct deletes
                      await supabase.from('check_ins').delete().eq('member_id', memberToDelete.id)
                      await supabase.from('redemptions').delete().eq('member_id', memberToDelete.id)
                      const { error } = await supabase.from('coffee_club_members').delete().eq('id', memberToDelete.id)
                      if (error) throw error
                    }
                    
                    // Verify deletion
                    const { data: verify } = await supabase
                      .from('coffee_club_members')
                      .select('id')
                      .eq('id', memberToDelete.id)
                      .maybeSingle()
                    
                    if (verify) {
                      console.error('Member still exists after delete! RLS may be blocking.')
                      throw new Error('Delete blocked by database permissions. Please run the migration SQL in Supabase Dashboard.')
                    }
                    
                    // Update local state immediately (no need to re-fetch)
                    setMembers(prev => prev.filter(m => m.id !== memberToDelete.id))
                    setCheckIns(prev => prev.filter(ci => ci.member_id !== memberToDelete.id))
                    setRedemptionRows(prev => prev.filter(r => r.member_id !== memberToDelete.id))
                    setMemberToDelete(null)
                    setExpandedMemberId(null)
                    console.log('Member deleted successfully')
                    setSaveMessage('Member deleted successfully!')
                    setTimeout(() => setSaveMessage(''), 3000)
                  } catch (err) {
                    console.error('Delete member error:', err)
                    alert('Failed to delete member: ' + (err as any)?.message)
                  } finally {
                    setIsDeleting(false)
                  }
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
