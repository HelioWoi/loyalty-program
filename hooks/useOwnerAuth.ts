import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface OwnerData {
  id: string
  auth_user_id: string
  full_name: string
  email: string
  phone: string | null
}

interface VenueData {
  id: string
  owner_id: string
  venue_name: string
  subdomain: string
  logo_url: string | null
  brand_colors: any
  active: boolean
}

export function useOwnerAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [owner, setOwner] = useState<OwnerData | null>(null)
  const [venues, setVenues] = useState<VenueData[]>([])
  const [currentVenue, setCurrentVenue] = useState<VenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    let isMounted = true
    
    const initAuth = async () => {
      if (isChecking) return // Prevent concurrent calls
      await checkAuth(isMounted)
    }
    
    initAuth()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      if (event === 'SIGNED_IN' && session?.user) {
        await loadOwnerData(session.user, isMounted)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setOwner(null)
        setVenues([])
        setCurrentVenue(null)
        setIsAuthenticated(false)
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function checkAuth(isMounted: boolean = true) {
    if (isChecking) return
    setIsChecking(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!isMounted) return
      
      if (user) {
        await loadOwnerData(user, isMounted)
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      if (isMounted) setIsAuthenticated(false)
    } finally {
      if (isMounted) {
        setLoading(false)
        setIsChecking(false)
      }
    }
  }

  async function loadOwnerData(user: User, isMounted: boolean = true) {
    try {
      // Load owner data
      const { data: ownerData, error: ownerError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (ownerError || !ownerData) {
        console.error('Owner not found:', ownerError)
        if (isMounted) setIsAuthenticated(false)
        return
      }

      // Load venues
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', ownerData.id)
        .order('created_at', { ascending: true })

      if (venuesError) {
        console.error('Venues load error:', venuesError)
      }

      if (!isMounted) return

      setUser(user)
      setOwner(ownerData)
      setVenues(venuesData || [])
      
      // Set first venue as current if available
      if (venuesData && venuesData.length > 0) {
        setCurrentVenue(venuesData[0])
      }
      
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Load owner data error:', error)
      if (isMounted) setIsAuthenticated(false)
    }
  }

  const logout = useCallback(async () => {
    console.log('Logout clicked - starting logout process')
    try {
      // Clear local state first
      setUser(null)
      setOwner(null)
      setVenues([])
      setCurrentVenue(null)
      setIsAuthenticated(false)
      
      await supabase.auth.signOut()
      console.log('Logout successful - redirecting to login')
      
      // Use window.location for reliable redirect (router.push can fail after signOut)
      window.location.href = '/owner-login'
    } catch (err) {
      console.error('Logout failed:', err)
      // Force redirect even if signOut fails
      window.location.href = '/owner-login'
    }
  }, [])

  const requireAuth = useCallback(() => {
    if (!loading && !isAuthenticated) {
      router.push('/owner-login')
    }
  }, [loading, isAuthenticated, router])

  return {
    user,
    owner,
    venues,
    currentVenue,
    setCurrentVenue,
    loading,
    isAuthenticated,
    logout,
    requireAuth,
  }
}
