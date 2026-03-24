'use client'

import { useState, useEffect } from 'react'

export interface MemberData {
  id: string
  email: string
  full_name: string
  visits_count: number
  reward_status: 'new' | 'active' | 'rewarded'
  points: number
}

const STORAGE_KEY = 'loyalty_member'

export function useAuth() {
  const [member, setMember] = useState<MemberData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load member data from localStorage on mount
    const storedData = localStorage.getItem(STORAGE_KEY)
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData)
        setMember(parsed)
      } catch (error) {
        console.error('Error parsing stored member data:', error)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = (memberData: MemberData) => {
    setMember(memberData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memberData))
  }

  const logout = () => {
    setMember(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const updateMember = (updates: Partial<MemberData>) => {
    if (!member) return
    
    const updated = { ...member, ...updates }
    setMember(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const isMember = !!member
  const isNewMember = member?.reward_status === 'new'
  const isActiveMember = member?.reward_status === 'active'
  const hasReward = member?.reward_status === 'rewarded'

  return {
    member,
    isLoading,
    isMember,
    isNewMember,
    isActiveMember,
    hasReward,
    login,
    logout,
    updateMember,
  }
}
