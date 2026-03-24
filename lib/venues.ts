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
    logo: 'https://nuwmbaohgwuanvzotbef.supabase.co/storage/v1/object/public/media/logo.png',
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
    logo: 'https://nuwmbaohgwuanvzotbef.supabase.co/storage/v1/object/public/media/logo.png',
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
  if (!venueId) return venues['backstreet-cafe'] // Default to backstreet-cafe for development
  return venues[venueId] || venues['backstreet-cafe']
}

export function getVenueFromHostname(hostname: string): VenueConfig {
  // For localhost/development, default to backstreet-cafe
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return venues['backstreet-cafe']
  }
  
  if (hostname.includes('backstreet')) {
    return venues['backstreet-cafe']
  }
  
  return venues['backstreet-cafe'] // Default to backstreet-cafe
}
