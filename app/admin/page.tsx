'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getVenueFromHostname, VenueConfig } from '@/lib/venues'

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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [venue, setVenue] = useState<VenueConfig | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity' | 'redemptions' | 'campaign'>('overview')
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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
  const [insightModal, setInsightModal] = useState<InsightModal | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVenue(getVenueFromHostname(window.location.hostname))
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Simple password check - in production use proper auth
    if (password === 'admin123') {
      setIsAuthenticated(true)
      loadDashboardData()
    } else {
      alert('Invalid password')
    }
  }

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Load members
      const { data: membersData } = await supabase
        .from('coffee_club_members')
        .select('*')
        .order('created_at', { ascending: false })

      // Load check-ins (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: checkInsData } = await supabase
        .from('check_ins')
        .select('*')
        .gte('checked_in_at', thirtyDaysAgo.toISOString())
        .order('checked_in_at', { ascending: false })

      if (membersData) setMembers(membersData)
      if (checkInsData) {
        setCheckIns(checkInsData)
        processHourlyData(checkInsData)
        processDailyData(checkInsData)
      }

      // Load redemptions
      const { data: redemptionsData } = await supabase
        .from('redemptions')
        .select('*')
        .order('redeemed_at', { ascending: false })
        .limit(100)

      if (redemptionsData) setRedemptionRows(redemptionsData)
      setTotalRewardsClaimed(redemptionsData?.length || 0)

      // Load campaign settings
      const { data: campData } = await supabase
        .from('loyalty_campaigns')
        .select('*')
        .eq('venue_id', 'backstreet-cafe')
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
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setIsLoading(false)
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

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: venue.colors.background }}>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            {venue.logo && (
              <div className="flex justify-center mb-4">
                <img src={venue.logo} alt={venue.brand} className="w-16 h-16 object-contain" />
              </div>
            )}
            <h1 className="text-2xl font-serif" style={{ color: venue.colors.text }}>Owner Dashboard</h1>
            <p className="text-sm" style={{ color: venue.colors.textLight }}>Enter password to access</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
              style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-white font-medium transition-all"
              style={{ backgroundColor: venue.colors.primary }}
            >
              Login
            </button>
          </form>
          <p className="text-xs text-center" style={{ color: venue.colors.textMuted }}>
            Powered by MenuLove™
          </p>
        </div>
      </div>
    )
  }

  // Dashboard
  return (
    <div className="min-h-screen" style={{ backgroundColor: venue.colors.background }}>
      {/* Header */}
      <div className="px-6 py-4 shadow-sm" style={{ backgroundColor: 'white' }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {venue.logo && (
              <img src={venue.logo} alt={venue.brand} className="w-10 h-10 object-contain" />
            )}
            <div>
              <h1 className="text-lg font-serif font-bold" style={{ color: venue.colors.text }}>{venue.brand}</h1>
              <p className="text-xs" style={{ color: venue.colors.textLight }}>Owner Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{ color: venue.colors.textLight }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['overview', 'members', 'activity', 'redemptions', 'campaign'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize"
              style={{
                backgroundColor: activeTab === tab ? venue.colors.primary : 'white',
                color: activeTab === tab ? 'white' : venue.colors.text,
              }}
            >
              {tab === 'campaign' ? 'Campaign Settings' : tab}
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
                <div className="bg-white rounded-2xl p-6 shadow">
                  <h3 className="text-sm font-medium uppercase tracking-wide mb-4" style={{ color: venue.colors.textMuted }}>
                    Check-ins by Hour (Last 30 Days)
                  </h3>
                  <div className="flex items-end gap-1 h-40">
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

                {/* Daily Chart */}
                <div className="bg-white rounded-2xl p-6 shadow">
                  <h3 className="text-sm font-medium uppercase tracking-wide mb-4" style={{ color: venue.colors.textMuted }}>
                    Check-ins by Day of Week (Last 30 Days)
                  </h3>
                  <div className="flex items-end gap-2 h-32">
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
                            const memberRedemptions = redemptionRows.filter(r => r.member_id === m.id)
                            const lastCheckin = memberCheckins.length > 0 ? new Date(memberCheckins[0].checked_in_at) : null
                            return (
                              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                <td colSpan={5} className="p-0">
                                  <div className="flex items-center px-4 py-2.5">
                                    <div className="flex-1 text-sm font-medium" style={{ color: venue.colors.text }}>{m.full_name}</div>
                                    <div className="hidden sm:block flex-1 text-xs" style={{ color: venue.colors.textLight }}>{m.email}</div>
                                    <div className="w-16 text-center">
                                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: venue.colors.accent }}>
                                        {m.points || 0}
                                      </span>
                                    </div>
                                    <div className="w-14 text-xs text-center" style={{ color: venue.colors.textLight }}>{m.visits_count}</div>
                                    <div className="w-24 text-right">
                                      <button
                                        onClick={() => setExpandedMemberId(isExpanded ? null : m.id)}
                                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all hover:bg-gray-50"
                                        style={{ borderColor: isExpanded ? venue.colors.accent : venue.colors.textMuted, color: isExpanded ? venue.colors.accent : venue.colors.textLight }}
                                      >
                                        {isExpanded ? 'Close' : 'See details'}
                                      </button>
                                    </div>
                                  </div>
                                  {isExpanded && (
                                    <div className="px-4 pb-4 pt-1">
                                      <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: venue.colors.background }}>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                          <div>
                                            <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: venue.colors.textMuted }}>Total Points</p>
                                            <p className="text-lg font-serif" style={{ color: venue.colors.accent }}>{m.points || 0}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: venue.colors.textMuted }}>Check-ins (30d)</p>
                                            <p className="text-lg font-serif" style={{ color: venue.colors.text }}>{memberCheckins.length}</p>
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
                                              {lastCheckin ? `${lastCheckin.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} at ${lastCheckin.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}` : 'None in last 30 days'}
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
                                    </div>
                                  )}
                                </td>
                              </tr>
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
                  <h3 className="font-medium" style={{ color: venue.colors.text }}>
                    Redemption History ({redemptionRows.length})
                  </h3>
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

                {/* Branding */}
                <div className="bg-white rounded-2xl p-6 shadow space-y-4">
                  <div>
                    <h3 className="font-medium text-lg" style={{ color: venue.colors.text }}>Branding</h3>
                    <p className="text-xs mt-0.5" style={{ color: venue.colors.textMuted }}>Your logo appears on the landing page, check-in, and rewards screens.</p>
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
                              const fileName = `${venue.id}-logo-${Date.now()}.${ext}`

                              // Upload to Supabase storage
                              const { data: uploadData, error: uploadError } = await supabase.storage
                                .from('logos')
                                .upload(fileName, file, { upsert: true })

                              if (uploadError) {
                                // Fallback: convert to base64 data URL
                                const reader = new FileReader()
                                reader.onload = async (ev) => {
                                  const dataUrl = ev.target?.result as string
                                  setCampaignData({ ...campaignData, logo_url: dataUrl })
                                  // Log to venue_logos
                                  await supabase.from('venue_logos').insert({
                                    venue_id: venue.id,
                                    file_name: file.name,
                                    file_url: dataUrl.substring(0, 100) + '...',
                                  })
                                }
                                reader.readAsDataURL(file)
                              } else {
                                const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName)
                                const publicUrl = urlData.publicUrl
                                setCampaignData({ ...campaignData, logo_url: publicUrl })
                                // Log to venue_logos
                                await supabase.from('venue_logos').insert({
                                  venue_id: venue.id,
                                  file_name: file.name,
                                  file_url: publicUrl,
                                })
                              }
                            } catch (err) {
                              console.error('Upload error:', err)
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
                      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: venue.colors.textMuted }}>Campaign Name</label>
                      <input
                        type="text"
                        value={campaignData.campaign_name}
                        onChange={(e) => setCampaignData({ ...campaignData, campaign_name: e.target.value })}
                        className="w-full mt-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm"
                        style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                      />
                      <p className="text-[11px] mt-1" style={{ color: venue.colors.textMuted }}>Shown as the title on the landing page.</p>
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
                      <p className="text-xs mt-0.5" style={{ color: venue.colors.textMuted }}>
                        Create up to 4 rewards. Customers unlock them as they earn points.
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
                    setIsSaving(true)
                    setSaveMessage('')
                    try {
                      // Update campaign
                      await supabase
                        .from('loyalty_campaigns')
                        .update({
                          campaign_name: campaignData.campaign_name,
                          points_per_checkin: campaignData.points_per_checkin,
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', campaignData.id)

                      // Handle rewards: update existing, create new, delete removed
                      const existingIds = rewardsData.filter(r => !r.id.startsWith('new-')).map(r => r.id)

                      // Delete rewards that were removed
                      const { data: currentRewards } = await supabase
                        .from('loyalty_rewards')
                        .select('id')
                        .eq('campaign_id', campaignData.id)

                      if (currentRewards) {
                        for (const cr of currentRewards) {
                          if (!existingIds.includes(cr.id)) {
                            await supabase.from('loyalty_rewards').delete().eq('id', cr.id)
                          }
                        }
                      }

                      // Update existing and create new rewards
                      for (let i = 0; i < rewardsData.length; i++) {
                        const reward = rewardsData[i]
                        if (reward.id.startsWith('new-')) {
                          // Create new reward
                          await supabase.from('loyalty_rewards').insert({
                            campaign_id: campaignData.id,
                            name: reward.name,
                            points_required: reward.points_required,
                            description: reward.description,
                            active: reward.active,
                            sort_order: i + 1,
                          })
                        } else {
                          // Update existing reward
                          await supabase
                            .from('loyalty_rewards')
                            .update({
                              name: reward.name,
                              points_required: reward.points_required,
                              description: reward.description,
                              active: reward.active,
                              sort_order: i + 1,
                            })
                            .eq('id', reward.id)
                        }
                      }

                      // Reload rewards to get real IDs for newly created ones
                      const { data: freshRewards } = await supabase
                        .from('loyalty_rewards')
                        .select('*')
                        .eq('campaign_id', campaignData.id)
                        .order('sort_order', { ascending: true })

                      if (freshRewards) setRewardsData(freshRewards)

                      setSaveMessage('Settings saved successfully!')
                      setTimeout(() => setSaveMessage(''), 3000)
                    } catch (err) {
                      console.error('Save error:', err)
                      setSaveMessage('Error saving settings.')
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
                    <input
                      type="text"
                      value={activitySearch}
                      onChange={(e) => { setActivitySearch(e.target.value); setActivityPage(1) }}
                      placeholder="Search by name..."
                      className="px-3 py-2 rounded-lg border text-sm w-full sm:w-56 focus:outline-none focus:ring-2"
                      style={{ borderColor: venue.colors.textMuted, color: venue.colors.text }}
                    />
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
    </div>
  )
}
