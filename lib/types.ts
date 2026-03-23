export interface CoffeeMember {
  id: string
  full_name: string
  email: string
  created_at: string
  updated_at: string
  source: string
  brand: string
  venue: string
  visits_count: number
  reward_status: 'new' | 'active' | 'rewarded'
}

export interface SignupFormData {
  full_name: string
  email: string
}
