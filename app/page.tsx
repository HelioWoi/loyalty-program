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

type Screen = 'landing' | 'signup' | 'success' | 'checkin' | 'rewards'

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing')
  const [venueId, setVenueId] = useState<string>('')
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [isMainDomain, setIsMainDomain] = useState(false)
  const { member, isMember, isLoading, login, updateMember } = useAuth()

  // Step 1: Load venue immediately (no auth needed)
  useEffect(() => {
    const loadVenue = async () => {
      if (typeof window === 'undefined') return
      
      const hostname = window.location.hostname
      
      // Check if this is the main domain (only production main domain)
      const isMain = hostname === 'menulove.com.au' || 
                     hostname === 'menulove-rewards.netlify.app'
      
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
      const venue = getVenueFromHostname(window.location.hostname)
      const currentHour = new Date().toISOString().slice(0, 13)
      const validToken = btoa(currentHour + venue.id).slice(0, 16)
      
      if (token === validToken) {
        setQrToken(token)
        
        if (isMember && member) {
          console.log('User already logged in:', member.email)
          window.history.replaceState({}, '', window.location.pathname)
          setCurrentScreen('checkin')
        } else {
          console.log('User not logged in, redirecting to /jointheclub')
          window.location.href = '/jointheclub'
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

      // Email doesn't exist - create new account
      console.log('Creating new account for:', data.email)
      const { data: insertData, error } = await supabase
        .from('coffee_club_members')
        .insert([
          {
            full_name: data.full_name,
            email: data.email,
            source: 'MenuLove Powered',
            brand: venue.brand,
            venue: venue.name,
            visits_count: 0,
            reward_status: 'new',
            points: 0,
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
          // New account - go directly to check-in
          setCurrentScreen('checkin')
        }
      } else if (insertData && insertData[0]) {
        // Success - login new member
        const newMember: MemberData = {
          id: insertData[0].id,
          email: insertData[0].email,
          full_name: insertData[0].full_name,
          visits_count: insertData[0].visits_count || 0,
          reward_status: insertData[0].reward_status || 'new',
          points: insertData[0].points || 0,
        }
        login(newMember)
        // New account - go directly to check-in for first check-in
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

  // Show institutional landing page ONLY for production main domain with NO venue params
  if (isMainDomain && !hasVenueParams) {
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
  // If user is NOT logged in and on landing, show signup
  if (currentScreen === 'landing') {
    if (isMember && member) {
      setCurrentScreen('checkin')
    } else {
      setCurrentScreen('signup')
    }
  }

  return (
    <>
      {currentScreen === 'signup' && (
        <SignupForm 
          onSubmit={handleSignupSubmit} 
          onBack={handleBackToCheckin} 
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
