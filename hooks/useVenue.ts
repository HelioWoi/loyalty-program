'use client'

import { useState, useEffect } from 'react'
import { getVenueConfig, getVenueFromHostname, VenueConfig } from '@/lib/venues'

export function useVenue(venueId?: string) {
  const [venue, setVenue] = useState<VenueConfig>(() => getVenueConfig(venueId))

  useEffect(() => {
    if (typeof window !== 'undefined' && !venueId) {
      const hostname = window.location.hostname
      const detectedVenue = getVenueFromHostname(hostname)
      setVenue(detectedVenue)
    }
  }, [venueId])

  return venue
}
