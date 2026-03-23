export interface VenueConfig {
  id: string
  name: string
  brand: string
  description: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    textLight: string
    textMuted: string
  }
  logo?: string
  domain?: string
}

export const venues: Record<string, VenueConfig> = {
  'backstreet-cafe': {
    id: 'backstreet-cafe',
    name: 'Backstreet Cafe',
    brand: 'Backstreet Coffee Club',
    description: 'Join the exclusive circle of coffee lovers at Backstreet Cafe.',
    colors: {
      primary: '#3D2817',
      secondary: '#2C1810',
      accent: '#D4A574',
      background: '#EDE8E3',
      text: '#2C1810',
      textLight: '#6B5D54',
      textMuted: '#B5A89C',
    },
  },
  'default': {
    id: 'default',
    name: 'Coffee Shop',
    brand: 'Loyalty Program',
    description: 'Join our exclusive loyalty program and start earning rewards.',
    colors: {
      primary: '#3D2817',
      secondary: '#2C1810',
      accent: '#D4A574',
      background: '#EDE8E3',
      text: '#2C1810',
      textLight: '#6B5D54',
      textMuted: '#B5A89C',
    },
  },
}

export function getVenueConfig(venueId?: string): VenueConfig {
  if (!venueId) return venues.default
  return venues[venueId] || venues.default
}

export function getVenueFromHostname(hostname: string): VenueConfig {
  if (hostname.includes('backstreet')) {
    return venues['backstreet-cafe']
  }
  
  return venues.default
}
