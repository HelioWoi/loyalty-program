'use client'

import { useState, useEffect } from 'react'
import LandingPage from '@/components/LandingPage'
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
  const { member, isMember, login, updateMember } = useAuth()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const venue = getVenueFromHostname(hostname)
      setVenueId(venue.id)

      // Handle QR code scan: ?action=checkin
      const params = new URLSearchParams(window.location.search)
      const action = params.get('action')
      
      if (action === 'checkin') {
        // Clean URL without reloading
        window.history.replaceState({}, '', window.location.pathname)
        
        if (isMember && member) {
          // Member scans QR → auto check-in
          setCurrentScreen('checkin')
        } else {
          // Non-member scans QR → signup form
          setCurrentScreen('signup')
        }
      }
    }
  }, [isMember, member])

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
      console.log('Attempting to save:', data, 'for venue:', venue.brand)
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      
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

      console.log('Insert result - data:', insertData)
      console.log('Insert result - error:', error)

      if (error) {
        console.error('Supabase error:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        console.error('Error stringified:', JSON.stringify(error, null, 2))
        
        // Check if it's a duplicate email error
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          // Email already exists - fetch existing member and log them in
          console.log('Email already exists, logging in existing member...')
          const { data: existingMember, error: fetchError } = await supabase
            .from('coffee_club_members')
            .select('*')
            .eq('email', data.email)
            .single()

          if (!fetchError && existingMember) {
            const memberData: MemberData = {
              id: existingMember.id,
              email: existingMember.email,
              full_name: existingMember.full_name,
              visits_count: existingMember.visits_count || 0,
              reward_status: existingMember.reward_status || 'new',
              points: existingMember.points || 0,
            }
            login(memberData)
            setCurrentScreen('success')
            return
          }
        }
        
        // Other error - still proceed to success page
        console.log('Unknown error, proceeding anyway...')
      } else {
        // Fetch the created member to get the ID
        const { data: memberData, error: fetchError } = await supabase
          .from('coffee_club_members')
          .select('*')
          .eq('email', data.email)
          .single()

        if (!fetchError && memberData) {
          // Save member data to localStorage
          const newMember: MemberData = {
            id: memberData.id,
            email: memberData.email,
            full_name: memberData.full_name,
            visits_count: memberData.visits_count || 0,
            reward_status: memberData.reward_status || 'new',
            points: memberData.points || 0,
          }
          login(newMember)
        }
      }

      setCurrentScreen('success')
    } catch (error) {
      console.error('Signup error:', error)
      setCurrentScreen('success')
    }
  }

  const handleDone = () => {
    setCurrentScreen(isMember ? 'checkin' : 'landing')
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
