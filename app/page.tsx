'use client'

import { useState } from 'react'
import LandingPage from '@/components/LandingPage'
import SignupForm from '@/components/SignupForm'
import SuccessPage from '@/components/SuccessPage'
import { supabase } from '@/lib/supabase'
import { SignupFormData } from '@/lib/types'

type Screen = 'landing' | 'signup' | 'success'

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing')

  const handleJoinClick = () => {
    setCurrentScreen('signup')
  }

  const handleSignupSubmit = async (data: SignupFormData) => {
    try {
      const { error } = await supabase
        .from('coffee_club_members')
        .insert([
          {
            full_name: data.full_name,
            email: data.email,
            source: 'MenuLove Powered',
            brand: 'Backstreet Coffee Club',
            venue: 'Backstreet Cafe',
            visits_count: 0,
            reward_status: 'new',
          },
        ])

      if (error) {
        console.error('Error inserting member:', error)
        throw error
      }

      setCurrentScreen('success')
    } catch (error) {
      console.error('Signup error:', error)
      alert('There was an error signing up. Please try again.')
    }
  }

  const handleDone = () => {
    setCurrentScreen('landing')
  }

  return (
    <>
      {currentScreen === 'landing' && <LandingPage onJoinClick={handleJoinClick} />}
      {currentScreen === 'signup' && <SignupForm onSubmit={handleSignupSubmit} />}
      {currentScreen === 'success' && <SuccessPage onDone={handleDone} />}
    </>
  )
}
