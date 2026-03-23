import { useEffect, useRef } from 'react'

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Create audio element with a simple notification sound using Web Audio API
    audioRef.current = new Audio()
    
    // Create a simple bell sound using data URI
    const bellSound = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGe77OWfTRAMUKbj8LZjHAU5kdfy0HotBSJ1xe/glEILElyx6OyrWBUIQ5zd8sFuJAUuhM/z3I4+CRZks+vmnlARDFCm4/C2YxwFOJHX8tB6LQUidb/v4JRCCxJcr+jrq1gVCEKb3PLBbiQFLoTP89yOPgkWY7Lr5p5QEQxPpuPwtmMcBTiR1/LQei0FInW+7+CUQgsSXK7o66tYFQhCmtzyv24kBS6Ez/PcjT4JFmKy6+aeUBEMT6bj8LZjHAU4kdfyz3otBSJ1vu/glEILElyu6OurWBUIQprc8r9uJAUug8/z3I0+CRZhsurlnlARDE+m4/C2YhwFOJHX8s96LQUidb7v4JRCCxJcrujrq1gVCEKa3PK/biQFLoPP89yNPgkWYbLq5Z5QEQxPpuPwtmIcBTiR1/LPei0FInW+7+CUQgsSXK7o66tYFQhCmtzyv24kBS6Dz/PcjT4JFmGy6uWeUBEMT6bj8LZiHAU4kdfyz3otBSJ1vu/glEILElyu6OurWBUIQprc8r9uJAUug8/z3I0+CRZhsurlnlARDE+m4/C2YhwFOJHX8s96LQUidb7v4JRCCxJcrujrq1gVCEKa3PK/biQFLoPP89yNPgkWYbLq5Z5QEQxPpuPwtmIcBTiR1/LPei0FInW+7+CUQgsSXK7o66tYFQhCmtzyv24kBS6Dz/PcjT4JFmGy6uWeUBEMT6bj8LZiHAU4kdfyz3otBSJ1vu/glEILElyu6OurWBUIQprc8r9uJAUug8/z3I0+CRZhsurlnlARDE+m4/C2YhwFOJHX8s96LQUidb7v4JRCCxJcrujrq1gVCEKa3PK/biQFLoPP89yNPgkWYbLq5Z5QEQxPpuPwtmIcBTiR1/LPei0FInW+7+CUQgsSXK7o66tYFQhCmtzyv24kBS6Dz/PcjT4JFmGy6uWeUBEMT6bj8LZiHAU4kdfyz3otBSJ1vu/glEILElyu6OurWBUIQprc8r9uJAUug8/z3I0+CRZhsurlnlARDE+m4/C2YhwFOJHX8s96LQUidb7v4JRCCxJcrujrq1gVCEKa3PK/biQFLoPP89yNPgkWYbLq5Z5QEQxPpuPwtmIcBTiR1/LPei0FInW+7+CUQgsSXK7o66tYFQhCmtzyv24kBS6Dz/PcjT4JFmGy6uWeUBEMT6bj8LZiHAU4kdfyz3otBSJ1vu/glEILElyu6OurWBUIQprc8r9uJAUug8/z3I0+CRZhsurlnlARDE+m4/C2YhwFOJHX8s96LQUidb7v4Q=='
    
    audioRef.current.src = bellSound
    audioRef.current.volume = 0.5
  }, [])

  const playNotification = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(err => {
        console.log('Audio play failed:', err)
      })
    }
  }

  return { playNotification }
}
