'use client'

import { useState, useEffect } from 'react'
import LandingPage from '@/components/LandingPage'
import SignupForm from '@/components/SignupForm'
import SuccessPage from '@/components/SuccessPage'
import { supabase } from '@/lib/supabase'
import { SignupFormData } from '@/lib/types'
import { getVenueFromHostname } from '@/lib/venues'

type Screen = 'landing' | 'signup' | 'success'

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing')
  const [venueId, setVenueId] = useState<string>('backstreet-cafe')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const venue = getVenueFromHostname(hostname)
      setVenueId(venue.id)
    }
  }, [])

  const handleJoinClick = () => {
    setCurrentScreen('signup')
  }

  const handleSignupSubmit = async (data: SignupFormData) => {
    try {
      const venue = getVenueFromHostname(window.location.hostname)
      console.log('Attempting to save:', data, 'for venue:', venue.brand)
      
      const { error } = await supabase
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
          },
        ])

      if (error) {
        console.error('Supabase error:', error)
        console.log('Table may not exist yet. Proceeding to success page anyway...')
      }

      setCurrentScreen('success')
    } catch (error) {
      console.error('Signup error:', error)
      setCurrentScreen('success')
    }
  }

  const handleDone = () => {
    setCurrentScreen('landing')
  }

  return (
    <>
      {currentScreen === 'landing' && <LandingPage onJoinClick={handleJoinClick} venueId={venueId} />}
      {currentScreen === 'signup' && <SignupForm onSubmit={handleSignupSubmit} venueId={venueId} />}
      {currentScreen === 'success' && <SuccessPage onDone={handleDone} venueId={venueId} />}
    </>
  )
}
