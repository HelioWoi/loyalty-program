'use client'

import { useState, useEffect } from 'react'
import LandingPage from '@/components/LandingPage'
import InstitutionalLanding from '@/components/InstitutionalLanding'
import SignupForm from '@/components/SignupForm'
import SuccessPage from '@/components/SuccessPage'
import CheckInPage from '@/components/CheckInPage'
import RewardsPage from '@/components/RewardsPage'
import { supabase } from '@/lib/supabase'
import { SignupFormData } from '@/lib/types'
import { getVenueFromHostname } from '@/lib/venues'
import { useAuth, MemberData } from '@/hooks/useAuth'
import { fetchCampaign } from '@/lib/loyalty'
import { useNotificationSound } from '@/hooks/useNotificationSound'

type Screen = 'landing' | 'signup' | 'success' | 'checkin' | 'rewards'

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing')
  const [venueId, setVenueId] = useState<string>('')
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [isMainDomain, setIsMainDomain] = useState(false)
  const { member, isMember, isLoading, login, updateMember } = useAuth()
  const { playNotification } = useNotificationSound()

  // Step 1: Load venue immediately (no auth needed)
  useEffect(() => {
    const loadVenue = async () => {
      if (typeof window === 'undefined') return
      
      const hostname = window.location.hostname
      
      // Check if this is the main domain (only production main domain)
      const isMain = hostname === 'menulove.com.au'
      
      setIsMainDomain(isMain)
      if (isMain) return
      
      // Try to get venue from hostname first
      const venue = getVenueFromHostname(hostname)
      let actualVenueId = venue.id
      
      // If still using default/hardcoded ID, fetch from database
      if (!actualVenueId || actualVenueId === 'backstreet-cafe') {
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
      
      setVenueId(actualVenueId)
    }
    
    loadVenue()
  }, [])

  // Step 2: Process URL params after auth is ready
  useEffect(() => {
    if (isLoading) return // Wait for auth
    if (typeof window === 'undefined') return
    
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const token = params.get('token')
    const screen = params.get('screen')
    const source = params.get('source')
    const venueParam = params.get('venue')

    // Store source for later use in signup
    if (source) {
      sessionStorage.setItem('signup_source', source)
    }

    // If venue parameter exists, load that venue (for multi-tenant QR codes)
    if (venueParam) {
      sessionStorage.setItem('qr_venue_id', venueParam)
    }

    // Handle ?screen=signup → go directly to Join the Club
    if (screen === 'signup') {
      // Restore QR token from sessionStorage (saved before redirect from QR scan)
      const savedToken = sessionStorage.getItem('qr_token')
      if (savedToken) {
        setQrToken(savedToken)
        // Don't remove yet - will be cleared after check-in
      }
      window.history.replaceState({}, '', window.location.pathname)
      if (isMember && member) {
        setCurrentScreen('checkin')
      } else {
        setCurrentScreen('signup')
      }
      return
    }
    
    // Handle QR code scan: ?action=checkin&token=xxx
    if (action === 'checkin' && token) {
      // Get venue ID from URL param or use current venueId
      const venueParam = params.get('venue') || sessionStorage.getItem('qr_venue_id') || venueId
      
      if (!venueParam) {
        alert('Invalid QR code: venue not specified.')
        return
      }
      
      const currentHour = new Date().toISOString().slice(0, 13)
      const validToken = btoa(currentHour + venueParam).slice(0, 16)
      
      console.log('QR validation:', { token, validToken, venueParam, currentHour })
      
      if (token === validToken) {
        setQrToken(token)
        
        if (isMember && member) {
          console.log('User already logged in:', member.email)
          window.history.replaceState({}, '', window.location.pathname)
          setCurrentScreen('checkin')
        } else {
          // Save QR token to sessionStorage and redirect to signup flow
          sessionStorage.setItem('qr_token', token)
          console.log('User not logged in, saving QR token and redirecting to signup')
          window.location.href = '/?screen=signup'
        }
      } else {
        alert('Invalid or expired QR code. Please scan the current QR code at the venue.')
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [isMember, member, isLoading])

  const handleBack = () => {
    setCurrentScreen(isMember ? 'checkin' : 'landing')
  }

  const handleCheckIn = () => {
    setCurrentScreen('checkin')
  }

  const handleViewRewards = () => {
    setCurrentScreen('rewards')
  }

  const handleCheckInSuccess = (updatedMember: MemberData) => {
    updateMember(updatedMember)
    // Stay on check-in page after check-in completes
    setCurrentScreen('checkin')
  }

  const handleBackToCheckin = () => {
    setCurrentScreen('checkin')
  }

  const handleClaimReward = (updatedMember: MemberData) => {
    updateMember(updatedMember)
    // Stay on rewards page after redeem
  }

  const handleSignupSubmit = async (data: SignupFormData) => {
    try {
      const venue = getVenueFromHostname(window.location.hostname)
      console.log('Processing signup/login for:', data.email)
      
      // First, check if email already exists
      const { data: existingMember, error: checkError } = await supabase
        .from('coffee_club_members')
        .select('*')
        .eq('email', data.email)
        .eq('venue', venue.name)
        .single()

      if (existingMember && !checkError) {
        // Email exists - check if from QR scan or button
        const signupSource = sessionStorage.getItem('signup_source')
        sessionStorage.removeItem('signup_source') // Clear after use
        
        console.log('Email found, logging in existing member:', existingMember.full_name)
        const memberData: MemberData = {
          id: existingMember.id,
          email: existingMember.email,
          full_name: existingMember.full_name,
          visits_count: existingMember.visits_count || 0,
          reward_status: existingMember.reward_status || 'new',
          points: existingMember.points || 0,
        }
        login(memberData)
        
        if (signupSource === 'button') {
          // From Join Us button - alert and redirect to QR display
          alert('This email is already registered! Please scan the QR code at checkout to earn points.')
          window.location.href = '/qr-display'
          return
        } else if (qrToken) {
          // From QR scan with token - go directly to check-in
          setCurrentScreen('checkin')
          return
        } else {
          // Default - show success page
          setCurrentScreen('success')
          return
        }
      }

      // Email doesn't exist - create new account WITH first check-in points
      console.log('Creating new account for:', data.email)
      
      // Fetch campaign to know points_per_checkin BEFORE creating member
      const camp = await fetchCampaign(venueId)
      const pointsToAdd = camp?.points_per_checkin || 5
      console.log('Points per check-in from campaign:', pointsToAdd)
      
      // Create member already with first check-in points (avoids RLS UPDATE issue)
      const { data: insertData, error } = await supabase
        .from('coffee_club_members')
        .insert([
          {
            full_name: data.full_name,
            email: data.email,
            source: 'MenuLove Powered',
            brand: venue.brand,
            venue: venue.name,
            visits_count: 1,
            reward_status: 'active',
            points: pointsToAdd,
            last_check_in: new Date().toISOString(),
          },
        ])
        .select()

      if (error) {
        console.error('Insert error:', error)
        // Even if insert fails, try to fetch the member (might be race condition)
        const { data: retryMember } = await supabase
          .from('coffee_club_members')
          .select('*')
          .eq('email', data.email)
          .eq('venue', venue.name)
          .single()
        
        if (retryMember) {
          const memberData: MemberData = {
            id: retryMember.id,
            email: retryMember.email,
            full_name: retryMember.full_name,
            visits_count: retryMember.visits_count || 0,
            reward_status: retryMember.reward_status || 'new',
            points: retryMember.points || 0,
          }
          login(memberData)
          setCurrentScreen('checkin')
        }
      } else if (insertData && insertData[0]) {
        const memberId = insertData[0].id
        console.log('New member created with points:', pointsToAdd, 'ID:', memberId)
        
        // Also insert first check-in record (public can INSERT check_ins)
        // Table has 'venue TEXT NOT NULL' column, not 'venue_id'
        const { error: checkInError } = await supabase
          .from('check_ins')
          .insert({ member_id: memberId, venue: venue.name })
        
        if (checkInError) {
          console.warn('First check-in record insert failed:', checkInError.message)
        } else {
          console.log('First check-in record created successfully')
        }
        
        // Clear QR token so CheckInPage doesn't try another check-in
        sessionStorage.removeItem('qr_token')
        setQrToken(null)
        
        // Play success sound for first check-in
        playNotification()
        
        const newMember: MemberData = {
          id: memberId,
          email: insertData[0].email,
          full_name: insertData[0].full_name,
          visits_count: 1,
          reward_status: 'active',
          points: pointsToAdd,
        }
        login(newMember)
        setCurrentScreen('checkin')
      }
    } catch (error) {
      console.error('Signup error:', error)
      setCurrentScreen('success')
    }
  }

  const handleDone = () => {
    // Go to check-in to maintain locked flow between checkin and rewards
    setCurrentScreen('checkin')
  }

  // Check if URL has venue-specific params - if so, never show institutional page
  const hasVenueParams = typeof window !== 'undefined' && 
    (window.location.search.includes('screen=signup') || 
     window.location.search.includes('action=checkin') ||
     window.location.search.includes('source=button'))

  // Show institutional landing page for main domain OR localhost development
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1')
  
  // Prevent hydration mismatch by using useEffect to set the flag
  const [shouldShowInstitutional, setShouldShowInstitutional] = useState(false)
  
  useEffect(() => {
    const hasParams = typeof window !== 'undefined' && 
      (window.location.search.includes('screen=signup') || 
       window.location.search.includes('action=checkin') ||
       window.location.search.includes('source=button'))
    
    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1')
    
    setShouldShowInstitutional((isMainDomain || isLocal) && !hasParams)
  }, [isMainDomain])
  
  if (shouldShowInstitutional) {
    return <InstitutionalLanding />
  }

  // Don't render until venueId is loaded
  if (!venueId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    )
  }

  // If user is logged in and on landing, go to checkin
  // If user is NOT logged in, show LandingPage (QR code page)
  if (currentScreen === 'landing' && isMember && member) {
    setCurrentScreen('checkin')
  }

  return (
    <>
      {currentScreen === 'landing' && (
        <LandingPage
          venueId={venueId}
          onJoin={() => setCurrentScreen('signup')}
        />
      )}
      {currentScreen === 'signup' && (
        <SignupForm 
          onSubmit={handleSignupSubmit} 
          onBack={handleBack} 
          venueId={venueId} 
        />
      )}
      {currentScreen === 'success' && (
        <SuccessPage 
          onDone={handleDone} 
          venueId={venueId} 
        />
      )}
      {currentScreen === 'checkin' && member && (
        <CheckInPage
          member={member}
          venueId={venueId}
          qrToken={qrToken}
          onCheckInSuccess={handleCheckInSuccess}
          onViewRewards={handleViewRewards}
        />
      )}
      {currentScreen === 'rewards' && member && (
        <RewardsPage
          member={member}
          venueId={venueId}
          onBack={handleCheckIn}
          onClaimReward={handleClaimReward}
        />
      )}
    </>
  )
}
