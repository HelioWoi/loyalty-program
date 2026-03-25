import { supabase } from './supabase'

export interface VenueFromDb {
  id: string
  owner_id: string
  venue_name: string
  subdomain: string
  logo_url: string | null
  brand_colors: any
  active: boolean
}

// Fetch venue from database by ID
export async function fetchVenueById(venueId: string): Promise<VenueFromDb | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .eq('active', true)
    .single()

  if (error || !data) {
    console.error('Venue fetch error:', error)
    return null
  }

  return data
}

// Fetch first active venue (for development/testing)
export async function fetchFirstActiveVenue(): Promise<VenueFromDb | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('active', true)
    .limit(1)
    .single()

  if (error || !data) {
    console.error('No active venue found:', error)
    return null
  }

  return data
}

// Get venue ID from hostname or fetch from database
export async function getVenueIdForDisplay(): Promise<string> {
  // For now, fetch the first active venue from database
  // In production, this would be based on subdomain/hostname
  const venue = await fetchFirstActiveVenue()
  return venue?.id || 'default'
}
