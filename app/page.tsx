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
  const [venueId, setVenueId] = useState<string>('backstreet-cafe')
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [isMainDomain, setIsMainDomain] = useState(false)
  const { member, isMember, isLoading, login, updateMember } = useAuth()

  useEffect(() => {
    const handleQRScan = async () => {
      if (typeof window === 'undefined') return
      
      const hostname = window.location.hostname
      
      // Check if this is the main domain (no subdomain or localhost)
      const isMain = hostname === 'menulove-rewards.netlify.app' || 
                     hostname === 'localhost' ||
                     hostname === '127.0.0.1' ||
                     !hostname.includes('.')
      
      setIsMainDomain(isMain)
      
      // If main domain, don't process venue-specific logic
      if (isMain) return
      
      const venue = getVenueFromHostname(hostname)
      setVenueId(venue.id)

      // Wait for auth to finish loading before processing QR scan
      if (isLoading) {
        console.log('Auth still loading, waiting...')
        return
      }

      // Handle QR code scan: ?action=checkin&token=xxx
      const params = new URLSearchParams(window.location.search)
      const action = params.get('action')
      const token = params.get('token')
      
      if (action === 'checkin' && token) {
        // Validate token (timestamp-based: token should be current hour)
        const currentHour = new Date().toISOString().slice(0, 13) // YYYY-MM-DDTHH
        const validToken = btoa(currentHour + venue.id).slice(0, 16)
        
        if (token === validToken) {
          // Valid QR scan - store token to trigger check-in
          setQrToken(token)
          
          // Clean URL without reloading
          window.history.replaceState({}, '', window.location.pathname)
          
          if (isMember && member) {
            // Already logged in → go directly to check-in page
            console.log('User already logged in:', member.email)
            setCurrentScreen('checkin')
          } else {
            // Not logged in → show signup form
            console.log('User not logged in, showing signup form')
            setCurrentScreen('signup')
          }
        } else {
          // Invalid or expired token
          alert('Invalid or expired QR code. Please scan the current QR code at the venue.')
          window.history.replaceState({}, '', window.location.pathname)
        }
      }
    }
    
    handleQRScan()
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
    // Stay on check-in page - user navigates to rewards manually
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
        // Email exists - auto login
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
        
        // If QR token exists, go directly to check-in
        if (qrToken) {
          setCurrentScreen('checkin')
        } else {
          setCurrentScreen('success')
        }
        return
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
      }

      // If QR token exists, go directly to check-in
      if (qrToken) {
        setCurrentScreen('checkin')
      } else {
        setCurrentScreen('success')
      }
    } catch (error) {
      console.error('Signup error:', error)
      setCurrentScreen('success')
    }
  }

  const handleDone = () => {
    setCurrentScreen(isMember ? 'checkin' : 'landing')
  }

  // Show institutional landing page for main domain
  if (isMainDomain) {
    return <InstitutionalLanding />
  }

  return (
    <>
      {currentScreen === 'landing' && (
        <LandingPage 
          venueId={venueId} 
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
